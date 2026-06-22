"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  FileDown,
  Check,
} from "lucide-react"
import type { CompanySettings, Orcamento } from "@/lib/types"
import { fmtEuro, fmtDatePT, STATUS_LABELS, STATUS_COLORS } from "@/lib/brand"
import { buildOrcamentoHtml } from "@/lib/pdf-template"
import {
  cloneOrcamento,
  deleteOrcamento,
  setStatus,
} from "@/app/actions/orcamentos"

const STATUSES: Orcamento["status"][] = ["rascunho", "enviado", "aceite"]

export function OrcamentoDetail({
  orcamento,
  company,
}: {
  orcamento: Orcamento
  company: CompanySettings
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setLocalStatus] = useState(orcamento.status)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function changeStatus(s: Orcamento["status"]) {
    setLocalStatus(s)
    startTransition(async () => {
      await setStatus(orcamento.id, s)
      router.refresh()
    })
  }

  function clone() {
    startTransition(async () => {
      const created = await cloneOrcamento(orcamento.id)
      router.push(`/orcamento/${created.id}`)
      router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      await deleteOrcamento(orcamento.id)
      router.push("/")
      router.refresh()
    })
  }

  function gerarPDF() {
    const logoUrl = `${window.location.origin}/logo.png`
    const html = buildOrcamentoHtml(orcamento, company, logoUrl)
    const w = window.open("", "_blank")
    if (!w) return
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            aria-label="Voltar"
            className="pressable rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">#{orcamento.numero}</h1>
            <p className="text-sm text-muted-foreground">
              {orcamento.cliente_nome || "Sem cliente"} · {fmtDatePT(orcamento.data_emissao)}
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold text-white"
          style={{ backgroundColor: STATUS_COLORS[status] }}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Status switcher */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => changeStatus(s)}
            disabled={pending}
            className={`pressable flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${
              status === s
                ? "border-transparent text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
            style={status === s ? { backgroundColor: STATUS_COLORS[s] } : undefined}
          >
            {status === s ? <Check size={15} /> : null}
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ActionButton icon={FileDown} label="Gerar PDF" onClick={gerarPDF} primary />
        <ActionButton
          icon={Pencil}
          label="Editar"
          onClick={() => router.push(`/orcamento/${orcamento.id}/editar`)}
        />
        <ActionButton icon={Copy} label="Clonar" onClick={clone} disabled={pending} />
        <ActionButton
          icon={Trash2}
          label="Eliminar"
          onClick={() => setConfirmDelete(true)}
          danger
        />
      </div>

      {/* Document preview */}
      <DocumentPreview orcamento={orcamento} company={company} />

      {/* Delete confirm */}
      {confirmDelete ? (
        <div className="animate-in-fade fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="animate-scale-in w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg">
            <h3 className="font-semibold text-foreground">Eliminar orçamento?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O orçamento #{orcamento.numero} será removido permanentemente.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="pressable rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={remove}
                disabled={pending}
                className="pressable rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  primary,
  danger,
  disabled,
}: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  onClick: () => void
  primary?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  const base =
    "pressable flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-sm font-medium disabled:opacity-50"
  const cls = primary
    ? "border-transparent bg-primary text-primary-foreground hover:opacity-90"
    : danger
      ? "border-border bg-card text-destructive hover:bg-destructive/10"
      : "border-border bg-card text-foreground hover:bg-muted"
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${cls}`}>
      <Icon size={20} />
      {label}
    </button>
  )
}

/* Visual preview that mirrors the PDF */
function DocumentPreview({
  orcamento: o,
  company,
}: {
  orcamento: Orcamento
  company: CompanySettings
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pré-visualização do documento
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* meta */}
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoCard title="Dados do Orçamento">
            <KV k="Nº Orçamento" v={o.numero} />
            <KV k="Data emissão" v={fmtDatePT(o.data_emissao)} />
            <KV k="Validade até" v={fmtDatePT(o.validade_ate)} />
          </InfoCard>
          <InfoCard title="Cliente">
            <KV k="Nome" v={o.cliente_nome || "—"} />
            <KV k="NIF" v={o.cliente_nif || "—"} />
            <KV k="Contacto" v={o.cliente_contacto || "—"} />
            <KV k="Morada" v={o.cliente_morada || "—"} />
          </InfoCard>
        </div>

        {o.para_seguro ? (
          <InfoCard title="Dados do Sinistro / Seguradora">
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <KV k="Segurado" v={o.segurado || "—"} />
              <KV k="Seguradora" v={o.seguradora || "—"} />
              <KV k="Apólice" v={o.apolice || "—"} />
              <KV k="Sinistro em" v={o.sinistro_data || "—"} />
              <KV k="Obra/Local" v={o.obra || "—"} />
              <KV k="Vistoria" v={o.vistoria || "—"} />
            </div>
          </InfoCard>
        ) : null}

        {/* items */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="p-2 text-left font-semibold">Descrição</th>
                <th className="p-2 text-right font-semibold">Qtd</th>
                <th className="p-2 text-center font-semibold">Unid.</th>
                <th className="p-2 text-right font-semibold">Preço</th>
                <th className="p-2 text-center font-semibold">IVA</th>
                <th className="p-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {o.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    Sem itens
                  </td>
                </tr>
              ) : (
                o.items.map((it) => (
                  <tr key={it.id} className="border-b border-border even:bg-muted/40">
                    <td className="p-2 text-foreground">{it.descricao}</td>
                    <td className="p-2 text-right tabular-nums text-foreground">{it.quantidade}</td>
                    <td className="p-2 text-center text-foreground">{it.unidade}</td>
                    <td className="p-2 text-right tabular-nums text-foreground">
                      {fmtEuro(it.preco_unitario)}
                    </td>
                    <td className="p-2 text-center text-foreground">{it.iva}%</td>
                    <td className="p-2 text-right font-semibold tabular-nums text-foreground">
                      {fmtEuro(it.quantidade * it.preco_unitario)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* totals */}
        <div className="ml-auto w-full max-w-xs overflow-hidden rounded-lg border border-border">
          <div className="flex justify-between bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{fmtEuro(o.subtotal)}</span>
          </div>
          <div className="flex justify-between bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">IVA</span>
            <span className="font-medium text-foreground">{fmtEuro(o.total_iva)}</span>
          </div>
          <div className="flex justify-between bg-primary px-3 py-2 text-primary-foreground">
            <span className="font-bold">TOTAL</span>
            <span className="font-bold">{fmtEuro(o.total)}</span>
          </div>
        </div>

        {o.observacoes ? (
          <div className="rounded-lg border border-dashed border-border bg-accent/10 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
              Observações
            </p>
            <p className="whitespace-pre-wrap text-foreground">{o.observacoes}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">{title}</h4>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  )
}
