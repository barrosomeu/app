"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Pencil, Trash2, Users, X } from "lucide-react"
import type { Cliente } from "@/lib/types"
import {
  createCliente,
  updateCliente,
  deleteCliente,
  type ClienteInput,
} from "@/app/actions/clientes"

const EMPTY: ClienteInput = { nome: "", nif: "", contacto: "", morada: "", notas: "" }

export function ClientesManager({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.nif.toLowerCase().includes(q) ||
        c.contacto.toLowerCase().includes(q),
    )
  }, [clientes, query])

  function remove(id: string) {
    startTransition(async () => {
      await deleteCliente(id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <button
          onClick={() => setCreating(true)}
          className="pressable flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Novo cliente</span>
        </button>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar cliente…"
          className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Users size={40} className="text-muted-foreground" />
          <p className="font-medium text-foreground">Sem clientes</p>
          <p className="text-sm text-muted-foreground">
            Os clientes são guardados automaticamente ao criar orçamentos.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((c, i) => (
            <li
              key={c.id}
              className="animate-in-up flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{c.nome}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[c.nif && `NIF ${c.nif}`, c.contacto, c.morada].filter(Boolean).join(" · ") ||
                    "Sem detalhes"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => setEditing(c)}
                  aria-label="Editar"
                  className="pressable rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => remove(c.id)}
                  disabled={pending}
                  aria-label="Eliminar"
                  className="pressable rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <ClienteModal
          title="Novo cliente"
          initial={EMPTY}
          pending={pending}
          onClose={() => setCreating(false)}
          onSave={(data) =>
            startTransition(async () => {
              await createCliente(data)
              setCreating(false)
              router.refresh()
            })
          }
        />
      ) : null}

      {editing ? (
        <ClienteModal
          title="Editar cliente"
          initial={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(data) =>
            startTransition(async () => {
              await updateCliente(editing.id, data)
              setEditing(null)
              router.refresh()
            })
          }
        />
      ) : null}
    </div>
  )
}

function ClienteModal({
  title,
  initial,
  pending,
  onClose,
  onSave,
}: {
  title: string
  initial: ClienteInput
  pending: boolean
  onClose: () => void
  onSave: (data: ClienteInput) => void
}) {
  const [form, setForm] = useState<ClienteInput>(initial)
  const set = (k: keyof ClienteInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="animate-in-fade fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-in-up w-full max-w-md rounded-t-2xl border border-border bg-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg sm:rounded-2xl sm:pb-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="pressable rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <ModalField label="Nome" value={form.nome} onChange={set("nome")} />
          <ModalField label="NIF" value={form.nif} onChange={set("nif")} />
          <ModalField label="Contacto" value={form.contacto} onChange={set("contacto")} />
          <ModalField label="Morada" value={form.morada} onChange={set("morada")} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground">Notas</span>
            <textarea
              value={form.notas}
              onChange={set("notas")}
              rows={2}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="pressable rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ ...form, nome: form.nome.trim() })}
            disabled={pending || !form.nome.trim()}
            className="pressable rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalField({
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
