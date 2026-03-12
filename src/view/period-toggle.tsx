// src/view/period-toggle.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PeriodToggle() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Verifica se a URL tem o parâmetro "periodo=tudo"
    const isAllTime = searchParams.get("periodo") === "tudo";

    const handleToggle = (checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString());

        if (checked) {
            params.set("periodo", "tudo");
        } else {
            params.delete("periodo");
        }

        // Atualiza a URL sem fazer a tela pular (scroll: false)
        router.push(`?${params.toString()}`, { scroll: false });
    };

    return (
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
            <input
                type="checkbox"
                checked={isAllTime}
                onChange={(e) => handleToggle(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950"
            />
            Ver de todo o período
        </label>
    );
}