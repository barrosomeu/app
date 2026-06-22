import { listOrcamentos } from "@/app/actions/orcamentos"
import { OrcamentosList } from "@/components/orcamentos-list"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const orcamentos = await listOrcamentos()
  return <OrcamentosList orcamentos={orcamentos} />
}
