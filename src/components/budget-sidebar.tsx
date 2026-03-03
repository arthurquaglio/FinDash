"use client";

import { useState } from "react";
import { Target, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { upsertBudget } from "@/app/actions";

// Adicionamos a interface para o TypeScript parar de reclamar do 'any'
interface BudgetSidebarProps {
    categories: any[];
    budgets: any[];
}

export function BudgetSidebar({ categories, budgets }: BudgetSidebarProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    async function handleSave(categoryId: string) {
        const input = document.getElementById(`input-${categoryId}`) as HTMLInputElement;
        if (!input || !input.value) return;

        setLoadingId(categoryId);
        try {
            await upsertBudget(categoryId, parseFloat(input.value));
        } catch (error) {
            console.error("Erro ao salvar meta:", error);
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 gap-2 text-zinc-300">
                    <Target className="w-4 h-4 text-blue-400" />
                    Definir Metas
                </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 border-zinc-800 text-zinc-100 w-[400px] sm:w-[540px]">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl font-bold text-zinc-500">Metas Mensais</SheetTitle>
                    <SheetDescription className="text-zinc-500">
                        Defina o limite de gastos para cada categoria. As barras de progresso no dashboard serão atualizadas automaticamente.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 overflow-y-auto pr-2 max-h-[80vh]">
                    {categories.map((category) => {
                        // Procuramos se já existe uma meta para esta categoria
                        const currentBudget = budgets.find((b) => b.categoryId === category.id);

                        return (
                            <div key={category.id} className="space-y-3 pb-4 border-b border-zinc-900 last:border-0">
                                <div className="flex justify-between items-center">
                                    <label htmlFor={`input-${category.id}`} className="text-sm font-semibold text-zinc-300">
                                        {category.name}
                                    </label>
                                    {currentBudget && (
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Meta Ativa</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                                        <Input
                                            id={`input-${category.id}`}
                                            type="number"
                                            step="0.01"
                                            placeholder="0,00"
                                            defaultValue={currentBudget?.amount || ""}
                                            className="pl-9 bg-zinc-900 border-zinc-800 focus:ring-blue-500 text-zinc-100"
                                        />
                                    </div>
                                    <Button
                                        size="icon"
                                        className="bg-blue-600 hover:bg-blue-700 shrink-0 transition-all"
                                        disabled={loadingId === category.id}
                                        onClick={() => handleSave(category.id)}
                                    >
                                        {loadingId === category.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    );
}