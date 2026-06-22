import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { AppNav } from "@/components/app-nav"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login")
  return (
    <div className="min-h-dvh bg-muted pb-20 md:pb-0">
      <AppNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:py-8">{children}</main>
    </div>
  )
}
