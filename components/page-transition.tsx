"use client"

import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <main key={pathname} className="page-enter mx-auto w-full max-w-5xl px-4 py-6 md:py-8">
      {children}
    </main>
  )
}
