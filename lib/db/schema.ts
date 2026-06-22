import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core"

export type OrcamentoItem = {
  id: string
  descricao: string
  quantidade: number
  unidade: string
  preco_unitario: number
  iva: number
}

export const company = pgTable("company", {
  id: text("id").primaryKey().default("default"),
  nome_empresa: text("nome_empresa").notNull().default("CONSTRUÇÕES BARROS"),
  nome_titular: text("nome_titular").notNull().default("António Virgílio Marques Barros"),
  morada: text("morada").notNull().default("Bc Eira Velha 1, 4930-341 - Valença"),
  nif: text("nif").notNull().default("195060822"),
  telefone: text("telefone").notNull().default("930 582 585"),
  email: text("email").notNull().default("construcoesbarros.valenca@gmail.com"),
  iban: text("iban").notNull().default(""),
  iva_default: integer("iva_default").notNull().default(23),
})

export const clientes = pgTable("clientes", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  nif: text("nif").notNull().default(""),
  contacto: text("contacto").notNull().default(""),
  morada: text("morada").notNull().default(""),
  notas: text("notas").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const servicos = pgTable("servicos", {
  id: text("id").primaryKey(),
  descricao: text("descricao").notNull(),
  unidade: text("unidade").notNull().default("serviço"),
  preco_unitario: doublePrecision("preco_unitario").notNull().default(0),
  iva: integer("iva").notNull().default(23),
  uso_count: integer("uso_count").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const orcamentos = pgTable("orcamentos", {
  id: text("id").primaryKey(),
  numero: text("numero").notNull().unique(),
  data_emissao: text("data_emissao").notNull(),
  validade_ate: text("validade_ate").notNull(),
  validade_dias: integer("validade_dias").notNull().default(30),
  cliente_nome: text("cliente_nome").notNull().default(""),
  cliente_morada: text("cliente_morada").notNull().default(""),
  cliente_nif: text("cliente_nif").notNull().default(""),
  cliente_contacto: text("cliente_contacto").notNull().default(""),
  segurado: text("segurado").notNull().default(""),
  apolice: text("apolice").notNull().default(""),
  seguradora: text("seguradora").notNull().default(""),
  sinistro_data: text("sinistro_data").notNull().default(""),
  obra: text("obra").notNull().default(""),
  vistoria: text("vistoria").notNull().default(""),
  observacoes: text("observacoes").notNull().default(""),
  items: jsonb("items").$type<OrcamentoItem[]>().notNull().default([]),
  status: text("status", { enum: ["rascunho", "enviado", "aceite"] })
    .notNull()
    .default("rascunho"),
  para_seguro: boolean("para_seguro").notNull().default(true),
  subtotal: doublePrecision("subtotal").notNull().default(0),
  total_iva: doublePrecision("total_iva").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const counters = pgTable("counters", {
  id: text("id").primaryKey(),
  seq: integer("seq").notNull().default(0),
})
