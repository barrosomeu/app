"use server"

import { db } from "@/lib/db"
import { servicos, company } from "@/lib/db/schema"
import type { Servico, CompanySettings } from "@/lib/types"
import { asc, desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

function serializeServico(row: typeof servicos.$inferSelect): Servico {
  return {
    ...row,
    created_at:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
}

export async function listServicos(): Promise<Servico[]> {
  const rows = await db
    .select()
    .from(servicos)
    .orderBy(desc(servicos.uso_count), asc(servicos.descricao))
  return rows.map(serializeServico)
}

export async function deleteServico(id: string): Promise<void> {
  await db.delete(servicos).where(eq(servicos.id, id))
  revalidatePath("/definicoes")
}

export async function getCompany(): Promise<CompanySettings> {
  const rows = await db.select().from(company).where(eq(company.id, "default"))
  if (!rows[0]) {
    const inserted = await db.insert(company).values({ id: "default" }).returning()
    const { id, ...rest } = inserted[0]
    return rest
  }
  const { id, ...rest } = rows[0]
  return rest
}

export async function updateCompany(data: CompanySettings): Promise<CompanySettings> {
  const updated = await db
    .insert(company)
    .values({ id: "default", ...data })
    .onConflictDoUpdate({ target: company.id, set: data })
    .returning()
  revalidatePath("/definicoes")
  const { id, ...rest } = updated[0]
  return rest
}
