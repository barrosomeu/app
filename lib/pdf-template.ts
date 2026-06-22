import type { Orcamento, CompanySettings } from "@/lib/types"

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function fmt(v: number): string {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0)
}

function fmtDate(iso: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  if (!y) return iso
  return `${d}/${m}/${y}`
}

export function buildOrcamentoHtml(
  orc: Orcamento,
  company: CompanySettings,
  logoUrl: string,
): string {
  const itemsRows = (orc.items || [])
    .map((it) => {
      const total = (it.quantidade || 0) * (it.preco_unitario || 0)
      return `
      <tr>
        <td class="desc">${escapeHtml(it.descricao)}</td>
        <td class="num">${fmt(it.quantidade)}</td>
        <td class="ctr">${escapeHtml(it.unidade)}</td>
        <td class="num">€ ${fmt(it.preco_unitario)}</td>
        <td class="ctr">${it.iva}%</td>
        <td class="num bold">€ ${fmt(total)}</td>
      </tr>`
    })
    .join("")

  const empty =
    (orc.items || []).length === 0
      ? `<tr><td colspan="6" class="ctr muted">Sem itens</td></tr>`
      : ""

  const subtitle = orc.para_seguro
    ? "ORÇAMENTO PARA CLIENTE / SEGURO"
    : "ORÇAMENTO PARA CLIENTE"

  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8" />
<title>Orçamento ${escapeHtml(orc.numero)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #0F172A; margin: 0; padding: 24px 28px 40px 28px;
    font-size: 11px; line-height: 1.4;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 3px solid #1E40AF; padding-bottom: 12px; margin-bottom: 14px; }
  .logo { width: 110px; height: auto; }
  .company { text-align: right; font-size: 10.5px; line-height: 1.45; }
  .company .name { font-size: 14px; font-weight: 800; color: #1E40AF; letter-spacing: 0.5px; }
  .company .sub { color: #334155; }
  .title-band { background: #1E40AF; color: #fff; padding: 8px 12px; text-align: center;
    font-weight: 800; letter-spacing: 1px; font-size: 12px; border-radius: 4px; margin-bottom: 14px; }
  .meta-grid { display: flex; gap: 12px; margin-bottom: 14px; }
  .meta-card { flex: 1; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; background: #F8FAFC; }
  .meta-card h4 { margin: 0 0 6px 0; font-size: 9.5px; color: #1E40AF; text-transform: uppercase;
    letter-spacing: 1px; font-weight: 700; }
  .meta-row { display: flex; justify-content: space-between; margin: 2px 0; }
  .meta-row span:first-child { color: #64748B; }
  .meta-row span:last-child { font-weight: 600; }
  .section-title { background: #E0E7FF; color: #1E40AF; padding: 6px 10px; font-weight: 700;
    font-size: 10.5px; letter-spacing: 0.5px; border-radius: 4px 4px 0 0; margin-top: 6px; }
  .section-body { border: 1px solid #E2E8F0; border-top: none; padding: 8px 10px;
    border-radius: 0 0 4px 4px; margin-bottom: 12px; }
  .kv { display: flex; flex-wrap: wrap; gap: 8px 18px; }
  .kv .k { color: #64748B; font-size: 10px; }
  .kv .v { font-weight: 600; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  table.items thead th { background: #1E40AF; color: #fff; padding: 7px 6px; font-size: 10px;
    text-align: left; font-weight: 700; letter-spacing: 0.4px; }
  table.items tbody td { padding: 7px 6px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  table.items tbody tr:nth-child(even) { background: #F8FAFC; }
  td.desc { width: 42%; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.ctr { text-align: center; }
  .bold { font-weight: 700; }
  .muted { color: #64748B; padding: 18px 0 !important; }
  .totals { margin-left: auto; width: 280px; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; }
  .totals .row { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 11px; }
  .totals .row.sub { background: #F8FAFC; }
  .totals .row.total { background: #1E40AF; color: #fff; font-weight: 800; font-size: 13px; }
  .obs { margin-top: 14px; border: 1px dashed #CBD5E1; border-radius: 6px; padding: 10px 12px;
    background: #FFFBEB; font-size: 10.5px; }
  .obs h5 { margin: 0 0 4px 0; color: #B45309; font-size: 10px; letter-spacing: 0.5px; }
  .terms { margin-top: 12px; font-size: 9.5px; color: #475569; line-height: 1.5; }
  .accept { margin-top: 22px; display: flex; justify-content: space-between; gap: 18px; }
  .accept .box { flex: 1; border-top: 1px solid #0F172A; padding-top: 6px; font-size: 9.5px;
    color: #475569; text-align: center; }
  .footer { margin-top: 22px; text-align: center; color: #94A3B8; font-size: 9px;
    border-top: 1px solid #E2E8F0; padding-top: 8px; }
  @page { size: A4; margin: 0; }
  @media print { body { padding: 24px 28px 40px 28px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${logoUrl}" />
    <div class="company">
      <div class="name">${escapeHtml(company.nome_empresa)}</div>
      <div class="sub">${escapeHtml(company.nome_titular)}</div>
      <div class="sub">${escapeHtml(company.morada)}</div>
      <div class="sub">NIF: ${escapeHtml(company.nif)}</div>
      <div class="sub">Tel: ${escapeHtml(company.telefone)}</div>
      <div class="sub">${escapeHtml(company.email)}</div>
    </div>
  </div>

  <div class="title-band">${subtitle}</div>

  <div class="meta-grid">
    <div class="meta-card">
      <h4>Dados do Orçamento</h4>
      <div class="meta-row"><span>Nº Orçamento</span><span>${escapeHtml(orc.numero)}</span></div>
      <div class="meta-row"><span>Data emissão</span><span>${fmtDate(orc.data_emissao)}</span></div>
      <div class="meta-row"><span>Validade até</span><span>${fmtDate(orc.validade_ate)}</span></div>
    </div>
    <div class="meta-card">
      <h4>Cliente</h4>
      <div class="meta-row"><span>Nome</span><span>${escapeHtml(orc.cliente_nome) || "—"}</span></div>
      <div class="meta-row"><span>NIF</span><span>${escapeHtml(orc.cliente_nif) || "—"}</span></div>
      <div class="meta-row"><span>Contacto</span><span>${escapeHtml(orc.cliente_contacto) || "—"}</span></div>
      <div class="meta-row"><span>Morada</span><span>${escapeHtml(orc.cliente_morada) || "—"}</span></div>
    </div>
  </div>

  ${
    orc.para_seguro
      ? `
  <div class="section-title">Dados do Sinistro / Seguradora</div>
  <div class="section-body">
    <div class="kv">
      <div><span class="k">Segurado: </span><span class="v">${escapeHtml(orc.segurado) || "—"}</span></div>
      <div><span class="k">Seguradora: </span><span class="v">${escapeHtml(orc.seguradora) || "—"}</span></div>
      <div><span class="k">Apólice: </span><span class="v">${escapeHtml(orc.apolice) || "—"}</span></div>
      <div><span class="k">Sinistro em: </span><span class="v">${escapeHtml(orc.sinistro_data) || "—"}</span></div>
      <div><span class="k">Obra/Local: </span><span class="v">${escapeHtml(orc.obra) || "—"}</span></div>
      <div><span class="k">Vistoria: </span><span class="v">${escapeHtml(orc.vistoria) || "—"}</span></div>
    </div>
  </div>`
      : ""
  }

  <div class="section-title">Descrição dos Trabalhos</div>
  <table class="items">
    <thead>
      <tr>
        <th style="width:42%">Descrição</th>
        <th style="width:10%; text-align:right">Qtd</th>
        <th style="width:12%; text-align:center">Unid.</th>
        <th style="width:14%; text-align:right">Preço Unit.</th>
        <th style="width:8%; text-align:center">IVA</th>
        <th style="width:14%; text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}${empty}
    </tbody>
  </table>

  <div class="totals">
    <div class="row sub"><span>Subtotal</span><span>€ ${fmt(orc.subtotal)}</span></div>
    <div class="row sub"><span>IVA</span><span>€ ${fmt(orc.total_iva)}</span></div>
    <div class="row total"><span>TOTAL</span><span>€ ${fmt(orc.total)}</span></div>
  </div>

  ${
    orc.observacoes
      ? `<div class="obs"><h5>OBSERVAÇÕES</h5>${escapeHtml(orc.observacoes).replace(/\n/g, "<br/>")}</div>`
      : ""
  }

  <div class="terms">
    Validade do orçamento: ${orc.validade_dias} dias.
    ${orc.para_seguro ? "Proposta destinada a fins de seguro e reparação da ocorrência indicada. Anexar fotos, medições, relatório ou auto de ocorrência, se aplicável." : ""}
    ${company.iban ? `<br/>IBAN para pagamento: ${escapeHtml(company.iban)}` : ""}
  </div>

  <div class="accept">
    <div class="box">Aceitação do Orçamento — Assinatura do cliente</div>
    <div class="box">Nome legível / Data</div>
  </div>

  <div class="footer">
    ${escapeHtml(company.nome_empresa)} · ${escapeHtml(company.telefone)} · ${escapeHtml(company.email)}
  </div>
</body>
</html>`
}
