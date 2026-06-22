export const LOGO_URL = "/logo.png"

export const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aceite: "Aceite",
}

export const STATUS_COLORS: Record<string, string> = {
  rascunho: "#64748B",
  enviado: "#3B82F6",
  aceite: "#059669",
}

export const IVA_OPTIONS = [0, 6, 13, 23]

export const UNIDADE_OPTIONS = ["serviço", "un", "m²", "ml", "h", "dia", "kg", "pç"]

export const VALIDADE_OPTIONS = ["15", "30", "60", "90"]

export function fmtEuro(v: number): string {
  const n = Number.isFinite(v) ? v : 0
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n)
}

export function fmtDatePT(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  if (!y) return iso
  return `${d}/${m}/${y}`
}
