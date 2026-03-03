"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Função utilitária do Shadcn para classes

export function SidebarNav() {
    const pathname = usePathname();

    const routes = [
        {
            label: "Dashboard",
            icon: LayoutDashboard,
            href: "/",
            active: pathname === "/",
        },
        {
            label: "Gastos (Extrato)",
            icon: ReceiptText,
            href: "/gastos",
            active: pathname === "/gastos",
        },
    ];

    return (
        <nav className="flex flex-col gap-2">
            {routes.map((route) => (
                <Link key={route.href} href={route.href}>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 transition-all duration-200",
                            route.active
                                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-r-2 border-emerald-500 rounded-r-none"
                                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                        )}
                    >
                        <route.icon className={cn("w-5 h-5", route.active ? "text-emerald-500" : "text-zinc-500")} />
                        {route.label}
                    </Button>
                </Link>
            ))}
        </nav>
    );
}