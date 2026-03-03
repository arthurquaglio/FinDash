// src/app/layout.tsx
import { TrendingUp } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav"; // Importe aqui
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR">
        <body className="bg-zinc-950 text-zinc-50 flex min-h-screen">
        <aside className="w-64 border-r border-zinc-900 bg-zinc-950/50 p-6 flex flex-col gap-8 hidden md:flex sticky top-0 h-screen">
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-xl tracking-tight">
                <TrendingUp className="w-6 h-6" /> FinDash
            </div>

            {/* O NOVO COMPONENTE DE NAVEGAÇÃO */}
            <SidebarNav />

            <div className="mt-auto pt-6 border-t border-zinc-900">
                <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">Versão 1.2 MVP</p>
            </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
            {children}
        </main>
        </body>
        </html>
    );
}