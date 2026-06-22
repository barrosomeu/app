import { notFound } from "next/navigation"
import { getOrcamento } from "@/app/actions/orcamentos"
import { getCompany } from "@/app/actions/catalogo"
import { OrcamentoDetail } from "@/components/orcamento-detail"

export const dynamic = "force-dynamic"

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [orcamento, company] = await Promise.all([getOrcamento(id), getCompany()])
  if (!orcamento) notFound()
  return <OrcamentoDetail orcamento={orcamento} company={company} />
}
