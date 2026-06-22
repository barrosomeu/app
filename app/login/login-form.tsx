"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { loginWithPin } from "@/app/actions/auth"
import { LOGO_URL } from "@/lib/brand"

export function LoginForm() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await loginWithPin(pin)
      if (res.ok) {
        router.replace("/")
        router.refresh()
      } else {
        setError(res.error || "Erro")
        setPin("")
      }
    })
  }

  return (
    <form
      onSubmit={submit}
      className="animate-scale-in w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm"
    >
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Image
          src={LOGO_URL || "/placeholder.svg"}
          alt="Construções Barros"
          width={72}
          height={72}
          className="rounded-xl"
          priority
        />
        <div>
          <h1 className="text-lg font-bold text-foreground">CONSTRUÇÕES BARROS</h1>
          <p className="text-sm text-muted-foreground">Gestão de Orçamentos</p>
        </div>
      </div>

      <label htmlFor="pin" className="mb-1 block text-sm font-medium text-foreground">
        Código de acesso
      </label>
      <input
        id="pin"
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Introduz o PIN"
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-center text-lg tracking-widest text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
      />

      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || !pin}
        className="pressable mt-5 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "A entrar…" : "Entrar"}
      </button>
    </form>
  )
}
