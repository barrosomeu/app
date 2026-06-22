import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import { AppNav } from "@/components/app-nav"
import { PageTransition } from "@/components/page-transition"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/login")
  return (
    <div className="min-h-dvh bg-muted pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <AppNav />
      <PageTransition>{children}</PageTransition>
    </div>
  )
}
