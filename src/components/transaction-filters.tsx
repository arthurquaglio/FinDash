"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

export function TransactionFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Inicia os states com o que já estiver na URL (se tiver)
    const [type, setType] = useState(searchParams.get("type") || "");
    const [month, setMonth] = useState(searchParams.get("month") || "");

    const handleApplyFilters = () => {
        // Monta a nova URL com os filtros escolhidos
        const params = new URLSearchParams();

        if (type) params.set("type", type);
        if (month) params.set("month", month);

        // Dispara a navegação para atualizar a página e rodar o Prisma de novo
        router.push(`?${params.toString()}`);
    };

    const handleClearFilters = () => {
        setType("");
        setMonth("");
        router.push("?"); // Limpa a URL e volta a mostrar tudo
    };

    return (
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex flex-col md:flex-row gap-4 mb-6">

            {/* Exemplo de Select: Tipo */}
            <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            >
                <option value="">Todos os tipos</option>
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
            </select>

            {/* Exemplo de Select: Mês */}
            <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            >
                <option value="">Todos os meses</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                {/* Adicione os outros meses... */}
            </select>

            {/* Botões de Ação */}
            <div className="flex gap-2 mt-2 md:mt-0 md:ml-auto">
                <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                    Limpar
                </button>
                <button
                    onClick={handleApplyFilters}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <Filter className="w-4 h-4" />
                    Aplicar
                </button>
            </div>
        </div>
    );
}