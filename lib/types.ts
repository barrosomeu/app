export type OrcamentoItem = {
  id: string
  descricao: string
  quantidade: number
  unidade: string
  preco_unitario: number
  iva: number
}

export type Orcamento = {
  id: string
  numero: string
  data_emissao: string
  validade_ate: string
  validade_dias: number
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
  status: "rascunho" | "enviado" | "aceite"
  para_seguro: boolean
  subtotal: number
  total_iva: number
  total: number
  created_at: string
  updated_at: string
}

export type CompanySettings = {
  nome_empresa: string
  nome_titular: string
  morada: string
  nif: string
  telefone: string
  email: string
  iban: string
  iva_default: number
}

export type Cliente = {
  id: string
  nome: string
  nif: string
  contacto: string
  morada: string
  notas: string
  created_at: string
}

export type Servico = {
  id: string
  descricao: string
  unidade: string
  preco_unitario: number
  iva: number
  uso_count: number
  created_at: string
}
