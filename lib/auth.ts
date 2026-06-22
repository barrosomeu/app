import { cookies } from "next/headers"
import { createHmac } from "crypto"

const COOKIE_NAME = "cb_session"

function getPin(): string {
  return process.env.APP_PIN || "1234"
}

function getSecret(): string {
  return process.env.APP_SESSION_SECRET || process.env.APP_PIN || "construcoes-barros-secret"
}

function makeToken(): string {
  return createHmac("sha256", getSecret()).update("authenticated").digest("hex")
}

export function verifyPin(pin: string): boolean {
  return pin === getPin()
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return token === makeToken()
}

export async function createSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function destroySession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
