"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Save, Trash2, Package, Check } from "lucide-react"
import type { CompanySettings, Servico } from "@/lib/types"
import { fmtEuro, IVA_OPTIONS } from "@/lib/brand"
import { updateCompany, deleteServico } from "@/app/actions/catalogo"

export function DefinicoesManager({
  company,
  servicos,
}: {
  company: CompanySettings
  servicos: Servico[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<CompanySettings>(company)

  const set =
    (k: keyof CompanySettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({
        ...f,
        [k]: k === "iva_default" ? Number(e.target.value) : e.target.value,
      }))

  function save() {
    startTransition(async () => {
      await updateCompany(form)
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function removeServico(id: string) {
    startTransition(async () => {
      await deleteServico(id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">Definições</h1>

      {/* Empresa */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 font-semibold text-foreground">Dados da empresa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingField label="Nome da empresa" value={form.nome_empresa} onChange={set("nome_empresa")} />
          <SettingField label="Titular" value={form.nome_titular} onChange={set("nome_titular")} />
          <SettingField label="Morada" value={form.morada} onChange={set("morada")} />
          <SettingField label="NIF" value={form.nif} onChange={set("nif")} />
          <SettingField label="Telefone" value={form.telefone} onChange={set("telefone")} />
          <SettingField label="Email" value={form.email} onChange={set("email")} />
          <SettingField label="IBAN" value={form.iban} onChange={set("iban")} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">IVA por defeito (%)</span>
            <select
              value={String(form.iva_default)}
              onChange={set("iva_default")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            >
              {IVA_OPTIONS.map((i) => (
                <option key={i} value={i}>
                  {i}%
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={save}
          disabled={pending}
          className="pressable mt-5 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? "Guardado" : pending ? "A guardar…" : "Guardar dados"}
        </button>
      </section>

      {/* Catálogo de serviços */}
      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold text-foreground">Catálogo de serviços</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Serviços guardados automaticamente a partir dos orçamentos, ordenados por utilização.
        </p>

        {servicos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12 text-center">
            <Package size={36} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Ainda não há serviços. Cria orçamentos para construir o catálogo.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {servicos.map((s, i) => (
              <li
                key={s.id}
                className="animate-in-up flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{s.descricao}</p>
                  <p className="text-sm text-muted-foreground">
                    {fmtEuro(s.preco_unitario)} / {s.unidade} · IVA {s.iva}% · usado {s.uso_count}×
                  </p>
                </div>
                <button
                  onClick={() => removeServico(s.id)}
                  disabled={pending}
                  aria-label="Eliminar serviço"
                  className="pressable shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function SettingField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}
