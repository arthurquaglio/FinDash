"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/view/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/view/ui/dropdown-menu";
import { updateTransactionCategory } from "@/app/actions";
import { cn } from "@/utilitarios/utils";

// Mapa de cores para combinar com seu Seed
const categoryColors: Record<string, string> = {
    "Alimentação": "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
    "Moradia": "text-blue-500 border-blue-500/20 bg-blue-500/5",
    "Salário": "text-purple-500 border-purple-500/20 bg-purple-500/5",
    "Renda Fixa": "text-amber-500 border-amber-500/20 bg-amber-500/5",
    "Lazer": "text-pink-500 border-pink-500/20 bg-pink-500/5",
    "Educação": "text-indigo-500 border-indigo-500/20 bg-indigo-500/5",
    "Academia": "text-red-500 border-red-500/20 bg-red-500/5",
};

export function CategoryPicker({
                                   transactionId,
                                   currentCategory,
                                   allCategories
                               }: {
    transactionId: string,
    currentCategory: any,
    allCategories: any[]
}) {
    const [loading, setLoading] = useState(false);

    async function handleSelect(categoryId: string) {
        if (categoryId === currentCategory.id) return;
        setLoading(true);
        try {
            await updateTransactionCategory(transactionId, categoryId);
        } finally {
            setLoading(false);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className={cn(
                        "h-7 px-2 text-[10px] font-bold uppercase tracking-tighter border transition-all hover:opacity-80",
                        categoryColors[currentCategory.name] || "text-zinc-400 border-zinc-800 bg-zinc-900",
                        loading && "animate-pulse"
                    )}
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {currentCategory.name}
                    <ChevronDown className="ml-1 w-3 h-3 opacity-40" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-zinc-100 min-w-[160px]">
                {allCategories.map((cat) => (
                    <DropdownMenuItem
                        key={cat.id}
                        onClick={() => handleSelect(cat.id)}
                        className="flex items-center justify-between gap-2 text-xs py-2 focus:bg-emerald-500/10 focus:text-emerald-500 cursor-pointer"
                    >
                        <span className={cn("w-2 h-2 rounded-full", categoryColors[cat.name]?.split(' ')[0].replace('text-', 'bg-') || "bg-zinc-500")} />
                        <span className="flex-1">{cat.name}</span>
                        {cat.id === currentCategory.id && <Check className="w-3 h-3 text-emerald-500" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}