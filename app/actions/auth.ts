"use server"

import { verifyPin, createSession, destroySession } from "@/lib/auth"

export async function loginWithPin(pin: string): Promise<{ ok: boolean; error?: string }> {
  if (!verifyPin(pin)) {
    return { ok: false, error: "PIN incorreto" }
  }
  await createSession()
  return { ok: true }
}

export async function logout() {
  await destroySession()
}
