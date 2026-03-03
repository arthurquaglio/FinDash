"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, PieChart } from "lucide-react"; // Adicione ou mude os ícones conforme precisar

// Centralizamos as rotas aqui para ficar fácil de dar manutenção
const navItems = [
    { name: "Início", href: "/", icon: Home },
    { name: "Gastos", href: "/gastos", icon: Receipt },
    { name: "Orçamentos", href: "/orcamentos", icon: PieChart },
];

export function SidebarNav() {
    const pathname = usePathname();

    return (
        // flex-row no mobile (lado a lado), md:flex-col no desktop (um embaixo do outro)
        <nav className="flex w-full flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-2">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:py-3 rounded-lg transition-colors flex-1 md:flex-none justify-center md:justify-start ${
                            isActive
                                ? "bg-emerald-500/10 text-emerald-500" // Cor quando está ativo
                                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-50" // Cor padrão
                        }`}
                    >
                        <Icon className="w-6 h-6 md:w-5 md:h-5" />

                        {/* Texto minúsculo no mobile, tamanho normal no desktop */}
                        <span className="text-[10px] md:text-sm font-medium">
                            {item.name}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}