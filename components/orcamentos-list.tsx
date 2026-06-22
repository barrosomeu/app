"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Plus, Download, FileText } from "lucide-react"
import type { Orcamento } from "@/lib/types"
import { fmtEuro, fmtDatePT, STATUS_LABELS, STATUS_COLORS } from "@/lib/brand"

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "rascunho", label: "Rascunhos" },
  { key: "enviado", label: "Enviados" },
  { key: "aceite", label: "Aceites" },
]

export function OrcamentosList({ orcamentos }: { orcamentos: Orcamento[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("todos")

  const stats = useMemo(() => {
    const total = orcamentos.length
    const aceites = orcamentos.filter((o) => o.status === "aceite")
    const valorAceite = aceites.reduce((s, o) => s + o.total, 0)
    const valorTotal = orcamentos.reduce((s, o) => s + o.total, 0)
    return { total, aceites: aceites.length, valorAceite, valorTotal }
  }, [orcamentos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orcamentos.filter((o) => {
      if (filter !== "todos" && o.status !== filter) return false
      if (!q) return true
      return (
        o.numero.toLowerCase().includes(q) ||
        o.cliente_nome.toLowerCase().includes(q) ||
        o.obra.toLowerCase().includes(q) ||
        o.seguradora.toLowerCase().includes(q)
      )
    })
  }, [orcamentos, query, filter])

  function exportCSV() {
    const headers = ["Numero", "Data", "Cliente", "Obra", "Estado", "Subtotal", "IVA", "Total"]
    const rows = filtered.map((o) => [
      o.numero,
      fmtDatePT(o.data_emissao),
      o.cliente_nome,
      o.obra,
      STATUS_LABELS[o.status] ?? o.status,
      o.subtotal.toFixed(2),
      o.total_iva.toFixed(2),
      o.total.toFixed(2),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `orcamentos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
        <Link
          href="/novo"
          className="hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 md:flex"
        >
          <Plus size={18} />
          Novo orçamento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total" value={String(stats.total)} hint="orçamentos" />
        <StatCard label="Aceites" value={String(stats.aceites)} hint="adjudicados" />
        <StatCard label="Valor aceite" value={fmtEuro(stats.valorAceite)} hint="c/ IVA" accent />
        <StatCard label="Valor total" value={fmtEuro(stats.valorTotal)} hint="todos" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar nº, cliente, obra…"
              className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <Download size={18} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === f.key
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <FileText size={40} className="text-muted-foreground" />
          <p className="font-medium text-foreground">Sem orçamentos</p>
          <p className="text-sm text-muted-foreground">
            {query || filter !== "todos"
              ? "Nenhum resultado para os filtros atuais."
              : "Cria o teu primeiro orçamento."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orcamento/${o.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition hover:border-primary hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">#{o.numero}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: STATUS_COLORS[o.status] }}
                    >
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-medium text-foreground">
                    {o.cliente_nome || "Sem cliente"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {o.obra || "—"} · {fmtDatePT(o.data_emissao)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-foreground">{fmtEuro(o.total)}</p>
                  <p className="text-xs text-muted-foreground">c/ IVA</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Mobile FAB */}
      <Link
        href="/novo"
        aria-label="Novo orçamento"
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90 md:hidden"
      >
        <Plus size={26} />
      </Link>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
