import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import AppShell from "@/components/app-shell"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Casa Rancha Admin Dashboard",
  description: "Manage your Casa Rancha platform",
  generator: "Rancha Admin Dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
