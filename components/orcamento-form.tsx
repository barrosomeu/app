"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  ChevronDown,
  Save,
  ArrowLeft,
  Search,
} from "lucide-react"
import type { Cliente, Orcamento, OrcamentoItem, Servico } from "@/lib/types"
import {
  fmtEuro,
  IVA_OPTIONS,
  UNIDADE_OPTIONS,
  VALIDADE_OPTIONS,
} from "@/lib/brand"
import {
  createOrcamento,
  updateOrcamento,
  type OrcamentoInput,
} from "@/app/actions/orcamentos"

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

type Props = {
  mode: "new" | "edit"
  orcamento?: Orcamento
  nextNumero?: string
  clientes: Cliente[]
  servicos: Servico[]
  ivaDefault: number
}

export function OrcamentoForm({
  mode,
  orcamento,
  nextNumero,
  clientes,
  servicos,
  ivaDefault,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const [numero, setNumero] = useState(orcamento?.numero ?? nextNumero ?? "")
  const [numeroLocked, setNumeroLocked] = useState(true)

  const [paraSeguro, setParaSeguro] = useState(orcamento?.para_seguro ?? true)
  const [clienteNome, setClienteNome] = useState(orcamento?.cliente_nome ?? "")
  const [clienteMorada, setClienteMorada] = useState(orcamento?.cliente_morada ?? "")
  const [clienteNif, setClienteNif] = useState(orcamento?.cliente_nif ?? "")
  const [clienteContacto, setClienteContacto] = useState(orcamento?.cliente_contacto ?? "")

  const [segurado, setSegurado] = useState(orcamento?.segurado ?? "")
  const [apolice, setApolice] = useState(orcamento?.apolice ?? "")
  const [seguradora, setSeguradora] = useState(orcamento?.seguradora ?? "")
  const [sinistroData, setSinistroData] = useState(orcamento?.sinistro_data ?? "")

  const [obra, setObra] = useState(orcamento?.obra ?? "")
  const [vistoria, setVistoria] = useState(orcamento?.vistoria ?? "")
  const [observacoes, setObservacoes] = useState(orcamento?.observacoes ?? "")
  const [validadeDias, setValidadeDias] = useState(String(orcamento?.validade_dias ?? 30))
  const [status, setStatus] = useState<Orcamento["status"]>(orcamento?.status ?? "rascunho")

  const [items, setItems] = useState<OrcamentoItem[]>(
    orcamento?.items?.length
      ? orcamento.items
      : [{ id: uid(), descricao: "", quantidade: 1, unidade: "serviço", preco_unitario: 0, iva: ivaDefault }],
  )

  const [clientePicker, setClientePicker] = useState(false)
  const [servicoPickerFor, setServicoPickerFor] = useState<string | null>(null)

  const totals = useMemo(() => {
    let subtotal = 0
    let totalIva = 0
    for (const it of items) {
      const line = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0)
      subtotal += line
      totalIva += line * ((Number(it.iva) || 0) / 100)
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalIva: Math.round(totalIva * 100) / 100,
      total: Math.round((subtotal + totalIva) * 100) / 100,
    }
  }, [items])

  function patchItem(id: string, patch: Partial<OrcamentoItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: uid(), descricao: "", quantidade: 1, unidade: "serviço", preco_unitario: 0, iva: ivaDefault },
    ])
  }
  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))
  }

  function pickCliente(c: Cliente) {
    setClienteNome(c.nome)
    setClienteNif(c.nif)
    setClienteContacto(c.contacto)
    setClienteMorada(c.morada)
    setClientePicker(false)
  }

  function pickServico(itemId: string, s: Servico) {
    patchItem(itemId, {
      descricao: s.descricao,
      unidade: s.unidade,
      preco_unitario: s.preco_unitario,
      iva: s.iva,
    })
    setServicoPickerFor(null)
  }

  function save() {
    setError("")
    if (!clienteNome.trim()) {
      setError("Indica o nome do cliente.")
      return
    }
    if (items.every((it) => !it.descricao.trim())) {
      setError("Adiciona pelo menos um item com descrição.")
      return
    }
    const payload: OrcamentoInput = {
      numero: numero.trim() || undefined,
      cliente_nome: clienteNome.trim(),
      cliente_morada: clienteMorada.trim(),
      cliente_nif: clienteNif.trim(),
      cliente_contacto: clienteContacto.trim(),
      segurado: paraSeguro ? segurado.trim() : "",
      apolice: paraSeguro ? apolice.trim() : "",
      seguradora: paraSeguro ? seguradora.trim() : "",
      sinistro_data: paraSeguro ? sinistroData.trim() : "",
      obra: obra.trim(),
      vistoria: vistoria.trim(),
      observacoes: observacoes.trim(),
      items: items
        .filter((it) => it.descricao.trim())
        .map((it) => ({
          ...it,
          quantidade: Number(it.quantidade) || 0,
          preco_unitario: Number(it.preco_unitario) || 0,
          iva: Number(it.iva) || 0,
        })),
      validade_dias: Number(validadeDias) || 30,
      status,
      para_seguro: paraSeguro,
    }

    startTransition(async () => {
      try {
        if (mode === "edit" && orcamento) {
          await updateOrcamento(orcamento.id, payload)
          router.push(`/orcamento/${orcamento.id}`)
        } else {
          const created = await createOrcamento(payload)
          router.push(`/orcamento/${created.id}`)
        }
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao guardar")
      }
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-foreground">
          {mode === "edit" ? "Editar orçamento" : "Novo orçamento"}
        </h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Número + estado */}
      <Section title="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número">
            <div className="flex items-center gap-2">
              <input
                value={numero}
                disabled={numeroLocked}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => setNumeroLocked((v) => !v)}
                aria-label={numeroLocked ? "Desbloquear número" : "Bloquear número"}
                className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition hover:bg-muted"
              >
                {numeroLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
            </div>
          </Field>
          <Field label="Estado">
            <Select
              value={status}
              onChange={(v) => setStatus(v as Orcamento["status"])}
              options={[
                { value: "rascunho", label: "Rascunho" },
                { value: "enviado", label: "Enviado" },
                { value: "aceite", label: "Aceite" },
              ]}
            />
          </Field>
        </div>
      </Section>

      {/* Cliente */}
      <Section
        title="Cliente"
        action={
          clientes.length > 0 ? (
            <button
              type="button"
              onClick={() => setClientePicker((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <Search size={16} />
              Escolher existente
            </button>
          ) : null
        }
      >
        {clientePicker ? (
          <div className="mb-3 max-h-56 overflow-auto rounded-lg border border-border">
            {clientes.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => pickCliente(c)}
                className="flex w-full flex-col items-start border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted"
              >
                <span className="font-medium text-foreground">{c.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {[c.nif && `NIF ${c.nif}`, c.contacto].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <Input value={clienteNome} onChange={setClienteNome} placeholder="Nome do cliente" />
          </Field>
          <Field label="NIF">
            <Input value={clienteNif} onChange={setClienteNif} placeholder="Contribuinte" />
          </Field>
          <Field label="Contacto">
            <Input value={clienteContacto} onChange={setClienteContacto} placeholder="Telefone / email" />
          </Field>
          <Field label="Morada">
            <Input value={clienteMorada} onChange={setClienteMorada} placeholder="Morada" />
          </Field>
        </div>
      </Section>

      {/* Seguro */}
      <Section
        title="Dados de seguro"
        action={
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>Para seguro</span>
            <Toggle checked={paraSeguro} onChange={setParaSeguro} />
          </label>
        }
      >
        {paraSeguro ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Segurado">
              <Input value={segurado} onChange={setSegurado} placeholder="Nome do segurado" />
            </Field>
            <Field label="Seguradora">
              <Input value={seguradora} onChange={setSeguradora} placeholder="Seguradora" />
            </Field>
            <Field label="Apólice">
              <Input value={apolice} onChange={setApolice} placeholder="Nº apólice" />
            </Field>
            <Field label="Data do sinistro">
              <Input value={sinistroData} onChange={setSinistroData} type="date" />
            </Field>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Orçamento normal (sem dados de sinistro/seguro).
          </p>
        )}
      </Section>

      {/* Obra */}
      <Section title="Obra">
        <div className="grid gap-4">
          <Field label="Local / descrição da obra">
            <Input value={obra} onChange={setObra} placeholder="Ex.: Reparação de telhado" />
          </Field>
          <Field label="Vistoria">
            <Input value={vistoria} onChange={setVistoria} placeholder="Notas de vistoria" />
          </Field>
        </div>
      </Section>

      {/* Itens */}
      <Section
        title="Itens"
        action={
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Plus size={16} />
            Adicionar
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          {items.map((it, idx) => {
            const line = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0)
            return (
              <div key={it.id} className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Item {idx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    {servicos.length > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setServicoPickerFor((cur) => (cur === it.id ? null : it.id))
                        }
                        className="flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        <Search size={14} />
                        Catálogo
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      aria-label="Remover item"
                      className="rounded p-1 text-muted-foreground transition hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {servicoPickerFor === it.id ? (
                  <div className="mb-3 max-h-48 overflow-auto rounded-lg border border-border bg-card">
                    {servicos.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => pickServico(it.id, s)}
                        className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted"
                      >
                        <span className="truncate text-sm text-foreground">{s.descricao}</span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                          {fmtEuro(s.preco_unitario)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <textarea
                  value={it.descricao}
                  onChange={(e) => patchItem(it.id, { descricao: e.target.value })}
                  placeholder="Descrição do trabalho/material"
                  rows={2}
                  className="mb-2 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                />

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Field label="Qtd" small>
                    <input
                      type="number"
                      step="any"
                      value={it.quantidade}
                      onChange={(e) => patchItem(it.id, { quantidade: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="Unidade" small>
                    <Select
                      value={it.unidade}
                      onChange={(v) => patchItem(it.id, { unidade: v })}
                      options={UNIDADE_OPTIONS.map((u) => ({ value: u, label: u }))}
                    />
                  </Field>
                  <Field label="Preço un." small>
                    <input
                      type="number"
                      step="any"
                      value={it.preco_unitario}
                      onChange={(e) => patchItem(it.id, { preco_unitario: Number(e.target.value) })}
                      className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    />
                  </Field>
                  <Field label="IVA %" small>
                    <Select
                      value={String(it.iva)}
                      onChange={(v) => patchItem(it.id, { iva: Number(v) })}
                      options={IVA_OPTIONS.map((i) => ({ value: String(i), label: `${i}%` }))}
                    />
                  </Field>
                </div>
                <p className="mt-2 text-right text-sm text-muted-foreground">
                  Linha: <span className="font-semibold text-foreground">{fmtEuro(line)}</span>
                </p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Observações + validade */}
      <Section title="Outros">
        <div className="grid gap-4">
          <Field label="Validade (dias)">
            <Select
              value={validadeDias}
              onChange={setValidadeDias}
              options={VALIDADE_OPTIONS.map((v) => ({ value: v, label: `${v} dias` }))}
            />
          </Field>
          <Field label="Observações">
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Condições, notas adicionais…"
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>
      </Section>

      {/* Totais */}
      <div className="rounded-xl border border-border bg-card p-4">
        <Row label="Subtotal" value={fmtEuro(totals.subtotal)} />
        <Row label="IVA" value={fmtEuro(totals.totalIva)} />
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold text-foreground">{fmtEuro(totals.total)}</span>
        </div>
      </div>

      <div className="sticky bottom-20 z-10 md:bottom-4">
        <button
          onClick={save}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:opacity-50"
        >
          <Save size={18} />
          {pending ? "A guardar…" : mode === "edit" ? "Guardar alterações" : "Criar orçamento"}
        </button>
      </div>
    </div>
  )
}

/* ---------- small UI helpers ---------- */

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  small,
  children,
}: {
  label: string
  small?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`font-medium text-muted-foreground ${small ? "text-xs" : "text-sm"}`}>
        {label}
      </span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-primary" : "bg-input"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
