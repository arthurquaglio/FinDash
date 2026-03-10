// src/components/ui/goal-modal.tsx
"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addGoal } from "@/app/actions";

export function GoalModal() {
    const [open, setOpen] = useState(false);

    async function handleSubmit(formData: FormData) {
        const response = await addGoal(formData);

        if (response?.error) {
            alert(response.error);
            return;
        }

        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/10">
                    <Plus className="w-4 h-4 mr-2" /> Nova Caixinha
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-emerald-500" />
                        Criar Novo Objetivo
                    </DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 uppercase tracking-wider">Qual é o seu sonho?</label>
                        <Input name="name" placeholder="Ex: Viagem de Férias, Carro Novo" required className="bg-zinc-950 border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400 uppercase tracking-wider">Valor Alvo (R$)</label>
                            <Input name="targetAmount" type="number" step="0.01" min="1" placeholder="Ex: 5000" required className="bg-zinc-950 border-zinc-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400 uppercase tracking-wider">Já tem algo guardado?</label>
                            <Input name="currentAmount" type="number" step="0.01" min="0" defaultValue="0" className="bg-zinc-950 border-zinc-800" />
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4 text-white">Criar Caixinha</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}