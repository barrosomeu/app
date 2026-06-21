"use server"

import { db } from "@/lib/db"
import { orcamentos, counters, clientes, servicos } from "@/lib/db/schema"
import type { OrcamentoItem } from "@/lib/db/schema"
import type { Orcamento } from "@/lib/types"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function computeTotals(items: OrcamentoItem[]) {
  let subtotal = 0
  let total_iva = 0
  for (const it of items) {
    const qty = Number(it.quantidade) || 0
    const pu = Number(it.preco_unitario) || 0
    const iva = Number(it.iva) || 0
    const line = qty * pu
    subtotal += line
    total_iva += line * (iva / 100)
  }
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total_iva: Math.round(total_iva * 100) / 100,
    total: Math.round((subtotal + total_iva) * 100) / 100,
  }
}

function serialize(row: typeof orcamentos.$inferSelect): Orcamento {
  return {
    ...row,
    items: (row.items as OrcamentoItem[]) ?? [],
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  }
}

async function bumpCounterTo(year: number, seq: number) {
  const id = `orc_${year}`
  const existing = await db.select().from(counters).where(eq(counters.id, id))
  const current = existing[0]?.seq ?? 0
  if (seq > current) {
    await db
      .insert(counters)
      .values({ id, seq })
      .onConflictDoUpdate({ target: counters.id, set: { seq } })
  }
}

async function nextNumero(): Promise<string> {
  const year = new Date().getFullYear()
  const id = `orc_${year}`
  const rows = await db
    .insert(counters)
    .values({ id, seq: 1 })
    .onConflictDoUpdate({ target: counters.id, set: { seq: sql`${counters.seq} + 1` } })
    .returning()
  const seq = rows[0]?.seq ?? 1
  return `${year}${String(seq).padStart(3, "0")}`
}

export async function peekNextNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const rows = await db.select().from(counters).where(eq(counters.id, `orc_${year}`))
  const seq = (rows[0]?.seq ?? 0) + 1
  return `${year}${String(seq).padStart(3, "0")}`
}

async function autoRecordCliente(orc: Orcamento) {
  const nome = (orc.cliente_nome || "").trim()
  if (!nome) return
  const existing = await db
    .select()
    .from(clientes)
    .where(sql`lower(${clientes.nome}) = lower(${nome})`)
  if (existing[0]) {
    const patch: Record<string, string> = {}
    if (orc.cliente_nif && !existing[0].nif) patch.nif = orc.cliente_nif
    if (orc.cliente_contacto && !existing[0].contacto) patch.contacto = orc.cliente_contacto
    if (orc.cliente_morada && !existing[0].morada) patch.morada = orc.cliente_morada
    if (Object.keys(patch).length) {
      await db.update(clientes).set(patch).where(eq(clientes.id, existing[0].id))
    }
    return
  }
  await db.insert(clientes).values({
    id: genId(),
    nome,
    nif: orc.cliente_nif || "",
    contacto: orc.cliente_contacto || "",
    morada: orc.cliente_morada || "",
    notas: "",
  })
}

async function autoRecordServicos(items: OrcamentoItem[]) {
  for (const it of items) {
    const desc = (it.descricao || "").trim()
    if (!desc) continue
    const existing = await db
      .select()
      .from(servicos)
      .where(sql`lower(${servicos.descricao}) = lower(${desc})`)
    if (existing[0]) {
      await db
        .update(servicos)
        .set({
          uso_count: existing[0].uso_count + 1,
          unidade: it.unidade ?? existing[0].unidade,
          preco_unitario: Number(it.preco_unitario ?? existing[0].preco_unitario),
          iva: Number(it.iva ?? existing[0].iva),
        })
        .where(eq(servicos.id, existing[0].id))
    } else {
      await db.insert(servicos).values({
        id: genId(),
        descricao: desc,
        unidade: it.unidade || "serviço",
        preco_unitario: Number(it.preco_unitario) || 0,
        iva: Number(it.iva) || 0,
        uso_count: 1,
      })
    }
  }
}

export async function listOrcamentos(): Promise<Orcamento[]> {
  const rows = await db.select().from(orcamentos).orderBy(desc(orcamentos.numero))
  return rows.map(serialize)
}

export async function getOrcamento(id: string): Promise<Orcamento | null> {
  const rows = await db.select().from(orcamentos).where(eq(orcamentos.id, id))
  return rows[0] ? serialize(rows[0]) : null
}

export type OrcamentoInput = {
  numero?: string
  cliente_nome: string
  cliente_morada: string
  cliente_nif: string
  cliente_contacto: string
  segurado: string
  apolice: string
  seguradora: string
  sinistro_data: string
  obra: string
  vistoria: string
  observacoes: string
  items: OrcamentoItem[]
  validade_dias: number
  status: "rascunho" | "enviado" | "aceite"
  para_seguro: boolean
}

export async function createOrcamento(data: OrcamentoInput): Promise<Orcamento> {
  const now = todayISO()
  let numero: string
  if (data.numero) {
    const dup = await db.select().from(orcamentos).where(eq(orcamentos.numero, data.numero))
    if (dup[0]) throw new Error(`Já existe um orçamento com o número ${data.numero}`)
    numero = data.numero
    const year = parseInt(numero.slice(0, 4))
    const seq = parseInt(numero.slice(4))
    if (!Number.isNaN(year) && !Number.isNaN(seq)) await bumpCounterTo(year, seq)
  } else {
    numero = await nextNumero()
  }
  const totals = computeTotals(data.items)
  const row = {
    id: genId(),
    numero,
    data_emissao: now,
    validade_ate: addDays(now, data.validade_dias),
    validade_dias: data.validade_dias,
    cliente_nome: data.cliente_nome,
    cliente_morada: data.cliente_morada,
    cliente_nif: data.cliente_nif,
    cliente_contacto: data.cliente_contacto,
    segurado: data.segurado,
    apolice: data.apolice,
    seguradora: data.seguradora,
    sinistro_data: data.sinistro_data,
    obra: data.obra,
    vistoria: data.vistoria,
    observacoes: data.observacoes,
    items: data.items,
    status: data.status,
    para_seguro: data.para_seguro,
    ...totals,
  }
  const inserted = await db.insert(orcamentos).values(row).returning()
  const orc = serialize(inserted[0])
  await autoRecordCliente(orc)
  await autoRecordServicos(data.items)
  revalidatePath("/")
  return orc
}

export async function updateOrcamento(
  id: string,
  data: Partial<OrcamentoInput>,
): Promise<Orcamento> {
  const existingRows = await db.select().from(orcamentos).where(eq(orcamentos.id, id))
  const existing = existingRows[0]
  if (!existing) throw new Error("Orçamento não encontrado")

  const update: Record<string, unknown> = {}
  const fields: (keyof OrcamentoInput)[] = [
    "cliente_nome",
    "cliente_morada",
    "cliente_nif",
    "cliente_contacto",
    "segurado",
    "apolice",
    "seguradora",
    "sinistro_data",
    "obra",
    "vistoria",
    "observacoes",
    "status",
    "para_seguro",
  ]
  for (const f of fields) {
    if (data[f] !== undefined) update[f] = data[f]
  }

  if (data.numero !== undefined && data.numero !== existing.numero) {
    const dup = await db.select().from(orcamentos).where(eq(orcamentos.numero, data.numero))
    if (dup[0]) throw new Error(`Já existe um orçamento com o número ${data.numero}`)
    update.numero = data.numero
    const year = parseInt(data.numero.slice(0, 4))
    const seq = parseInt(data.numero.slice(4))
    if (!Number.isNaN(year) && !Number.isNaN(seq)) await bumpCounterTo(year, seq)
  }

  if (data.items !== undefined) {
    update.items = data.items
    Object.assign(update, computeTotals(data.items))
  }

  if (data.validade_dias !== undefined) {
    update.validade_dias = data.validade_dias
    update.validade_ate = addDays(existing.data_emissao, data.validade_dias)
  }

  update.updated_at = new Date()

  const updated = await db
    .update(orcamentos)
    .set(update)
    .where(eq(orcamentos.id, id))
    .returning()
  const orc = serialize(updated[0])
  if (data.items !== undefined) await autoRecordServicos(data.items)
  if (data.cliente_nome !== undefined) await autoRecordCliente(orc)
  revalidatePath("/")
  revalidatePath(`/orcamento/${id}`)
  return orc
}

export async function deleteOrcamento(id: string): Promise<void> {
  await db.delete(orcamentos).where(eq(orcamentos.id, id))
  revalidatePath("/")
}
