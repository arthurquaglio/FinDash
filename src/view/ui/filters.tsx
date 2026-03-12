"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/view/ui/input";
import { useDebouncedCallback } from "use-debounce";

export function Filters({ categories }: { categories: any[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Função mestre para atualizar a URL
    const updateFilters = useDebouncedCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        // Isso faz a página recarregar com os novos dados do servidor
        router.push(`/gastos?${params.toString()}`);
    }, 300);

    return (
        <div className="flex flex-wrap gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 mb-6">
            <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Descrição</label>
                <Input
                    placeholder="Ex: Mercado..."
                    defaultValue={searchParams.get("q") || ""}
                    onChange={(e) => updateFilters("q", e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                />
            </div>

            <div className="w-48">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Categoria</label>
                <select
                    className="w-full h-10 bg-zinc-950 border border-zinc-800 rounded-md px-3 text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-emerald-500"
                    value={searchParams.get("category") || ""}
                    onChange={(e) => updateFilters("category", e.target.value)}
                >
                    <option value="">Todas</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Início</label>
                <Input
                    type="date"
                    defaultValue={searchParams.get("start") || ""}
                    onChange={(e) => updateFilters("start", e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                />
            </div>

            <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Fim</label>
                <Input
                    type="date"
                    defaultValue={searchParams.get("end") || ""}
                    onChange={(e) => updateFilters("end", e.target.value)}
                    className="bg-zinc-950 border-zinc-800"
                />
            </div>
        </div>
    );
}