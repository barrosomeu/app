import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/")
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted px-4">
      <LoginForm />
    </main>
  )
}
