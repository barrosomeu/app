import { getCompany, listServicos } from "@/app/actions/catalogo"
import { DefinicoesManager } from "@/components/definicoes-manager"

export const dynamic = "force-dynamic"

export default async function DefinicoesPage() {
  const [company, servicos] = await Promise.all([getCompany(), listServicos()])
  return <DefinicoesManager company={company} servicos={servicos} />
}
