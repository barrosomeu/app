"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import { FileText, Plus, Users, Settings, LogOut } from "lucide-react"
import { LOGO_URL } from "@/lib/brand"
import { logout } from "@/app/actions/auth"

const links = [
  { href: "/", label: "Orçamentos", icon: FileText },
  { href: "/novo", label: "Novo", icon: Plus },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/definicoes", label: "Definições", icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname.startsWith(href)
}

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [, startTransition] = useTransition()

  function doLogout() {
    startTransition(async () => {
      await logout()
      router.replace("/login")
      router.refresh()
    })
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={LOGO_URL || "/placeholder.svg"}
              alt="Construções Barros"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground">CONSTRUÇÕES BARROS</p>
              <p className="text-xs text-muted-foreground">Gestão de Orçamentos</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`pressable flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive(pathname, href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            <button
              onClick={doLogout}
              className="ml-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-destructive"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>

          <button
            onClick={doLogout}
            aria-label="Sair"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive md:hidden"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card/95 pb-safe backdrop-blur md:hidden">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`pressable relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-all duration-300 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              <Icon size={22} className={`transition-transform duration-200 ${active ? "scale-110" : ""}`} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
