import { API_BASE } from '@/src/constants/brand';

export type OrcamentoItem = {
  id: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  iva: number;
};

export type Orcamento = {
  id: string;
  numero: string;
  data_emissao: string;
  validade_ate: string;
  validade_dias: number;
  cliente_nome: string;
  cliente_morada: string;
  cliente_nif: string;
  cliente_contacto: string;
  segurado: string;
  apolice: string;
  seguradora: string;
  sinistro_data: string;
  obra: string;
  vistoria: string;
  observacoes: string;
  items: OrcamentoItem[];
  status: 'rascunho' | 'enviado' | 'aceite';
  para_seguro: boolean;
  subtotal: number;
  total_iva: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  nome_empresa: string;
  nome_titular: string;
  morada: string;
  nif: string;
  telefone: string;
  email: string;
  iban: string;
  iva_default: number;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

export const api = {
  listOrcamentos: () => req<Orcamento[]>('/orcamentos'),
  getOrcamento: (id: string) => req<Orcamento>(`/orcamentos/${id}`),
  createOrcamento: (data: Partial<Orcamento>) =>
    req<Orcamento>('/orcamentos', { method: 'POST', body: JSON.stringify(data) }),
  updateOrcamento: (id: string, data: Partial<Orcamento>) =>
    req<Orcamento>(`/orcamentos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteOrcamento: (id: string) =>
    req<{ ok: boolean }>(`/orcamentos/${id}`, { method: 'DELETE' }),
  nextNumber: () => req<{ numero: string }>('/orcamentos/next-number'),
  getCompany: () => req<CompanySettings>('/company'),
  updateCompany: (data: CompanySettings) =>
    req<CompanySettings>('/company', { method: 'PUT', body: JSON.stringify(data) }),
};
