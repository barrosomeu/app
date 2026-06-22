import { listClientes } from "@/app/actions/clientes"
import { ClientesManager } from "@/components/clientes-manager"

export const dynamic = "force-dynamic"

export default async function ClientesPage() {
  const clientes = await listClientes()
  return <ClientesManager clientes={clientes} />
}
