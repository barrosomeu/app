"use server"

import { db } from "@/lib/db"
import { clientes } from "@/lib/db/schema"
import type { Cliente } from "@/lib/types"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function serialize(row: typeof clientes.$inferSelect): Cliente {
  return {
    ...row,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
}

export async function listClientes(): Promise<Cliente[]> {
  const rows = await db.select().from(clientes).orderBy(asc(clientes.nome))
  return rows.map(serialize)
}

export type ClienteInput = {
  nome: string
  nif: string
  contacto: string
  morada: string
  notas: string
}

export async function createCliente(data: ClienteInput): Promise<Cliente> {
  const inserted = await db
    .insert(clientes)
    .values({ id: genId(), ...data })
    .returning()
  revalidatePath("/clientes")
  return serialize(inserted[0])
}

export async function updateCliente(id: string, data: ClienteInput): Promise<Cliente> {
  const updated = await db.update(clientes).set(data).where(eq(clientes.id, id)).returning()
  if (!updated[0]) throw new Error("Cliente não encontrado")
  revalidatePath("/clientes")
  return serialize(updated[0])
}

export async function deleteCliente(id: string): Promise<void> {
  await db.delete(clientes).where(eq(clientes.id, id))
  revalidatePath("/clientes")
}
