// src/app/layout.tsx
import { TrendingUp } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { ProfileSelector } from "@/components/profile-selector";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import "./globals.css";
import React from "react";
import { Metadata, Viewport } from "next"; // Importado para suporte a PWA

// Configurações do PWA e SEO
export const metadata: Metadata = {
    title: "FinDash",
    description: "Nosso controle financeiro inteligente.",
    manifest: "/manifest.json", // Aponta para o arquivo que criamos na pasta public
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "FinDash",
    },
};

// Configurações de visualização (cor da barra do navegador no celular)
export const viewport: Viewport = {
    themeColor: "#10b981",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    // Busca os usuários no banco
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });

    // Lê qual é o perfil selecionado atualmente no cookie
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    return (
        <html lang="pt-BR">
        <body className="bg-zinc-950 text-zinc-50 flex flex-col md:flex-row min-h-screen">

        {/* === BARRA SUPERIOR MOBILE (Aparece só no celular) === */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-lg tracking-tight">
                <TrendingUp className="w-5 h-5"/> FinDash
            </div>
            <div className="w-32">
                <ProfileSelector users={users} activeId={activeProfileId}/>
            </div>
        </header>

        {/* === SIDEBAR DESKTOP === */}
        <aside
            className="w-64 border-r border-zinc-900 bg-zinc-950/50 p-6 hidden md:flex flex-col gap-8 sticky top-0 h-screen">
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-xl tracking-tight">
                <TrendingUp className="w-6 h-6" /> FinDash
            </div>

            <ProfileSelector users={users} activeId={activeProfileId} />

            <SidebarNav />

            <div className="mt-auto pt-6 border-t border-zinc-900">
                <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Versão Casal 1.0</p>
            </div>
        </aside>

        {/* === CONTEÚDO PRINCIPAL === */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
        </main>

        {/* === BARRA INFERIOR MOBILE (Aparece só no celular) === */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md z-50">
            <div className="flex justify-around items-center p-2">
                <SidebarNav />
            </div>
        </nav>

        </body>
        </html>
    );
}