import { notFound } from "next/navigation"
import { getOrcamento } from "@/app/actions/orcamentos"
import { listClientes } from "@/app/actions/clientes"
import { listServicos, getCompany } from "@/app/actions/catalogo"
import { OrcamentoForm } from "@/components/orcamento-form"

export const dynamic = "force-dynamic"

export default async function EditarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [orcamento, clientes, servicos, company] = await Promise.all([
    getOrcamento(id),
    listClientes(),
    listServicos(),
    getCompany(),
  ])
  if (!orcamento) notFound()

  return (
    <OrcamentoForm
      mode="edit"
      orcamento={orcamento}
      clientes={clientes}
      servicos={servicos}
      ivaDefault={company.iva_default}
    />
  )
}
