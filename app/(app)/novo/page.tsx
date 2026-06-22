import { peekNextNumber } from "@/app/actions/orcamentos"
import { listClientes } from "@/app/actions/clientes"
import { listServicos, getCompany } from "@/app/actions/catalogo"
import { OrcamentoForm } from "@/components/orcamento-form"

export const dynamic = "force-dynamic"

export default async function NovoPage() {
  const [numero, clientes, servicos, company] = await Promise.all([
    peekNextNumber(),
    listClientes(),
    listServicos(),
    getCompany(),
  ])

  return (
    <OrcamentoForm
      mode="new"
      nextNumero={numero}
      clientes={clientes}
      servicos={servicos}
      ivaDefault={company.iva_default}
    />
  )
}
