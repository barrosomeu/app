import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "Construções Barros — Orçamentos",
  description: "Gestão de orçamentos, clientes e serviços da Construções Barros.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" className="bg-background">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
