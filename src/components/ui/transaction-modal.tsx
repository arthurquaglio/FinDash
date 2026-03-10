// src/components/ui/transaction-modal.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addTransaction } from "@/app/actions";

export function TransactionModal({ types, categories }: any) {
    const [open, setOpen] = useState(false);
    const [isInstallment, setIsInstallment] = useState(false); // <-- Novo estado para controlar o checkbox

    async function handleSubmit(formData: FormData) {
        const response = await addTransaction(formData);

        if (response?.error) {
            alert(response.error);
            return;
        }

        setOpen(false);
        setIsInstallment(false); // Reseta o formulário ao fechar
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Nova Transação
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader><DialogTitle>Adicionar Transação</DialogTitle></DialogHeader>
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <Input name="name" placeholder="Nome" required className="bg-zinc-950 border-zinc-800" />
                    <Input name="value" type="number" step="0.01" placeholder="Valor Total" required className="bg-zinc-950 border-zinc-800" />

                    <div className="grid grid-cols-2 gap-4">
                        <Input name="date" type="date" required className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                        <select name="typeId" required className="bg-zinc-950 border-zinc-800 rounded-md px-2 text-sm">
                            {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <select name="categoryId" required className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm">
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {/* --- INÍCIO DA ÁREA DE PARCELAMENTO --- */}
                    <div className="flex flex-col gap-3 p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg mt-2">
                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isInstallment}
                                onChange={(e) => setIsInstallment(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 accent-emerald-500"
                            />
                            Esta compra é parcelada?
                        </label>

                        {/* Só mostra este campo se o checkbox estiver marcado */}
                        {isInstallment && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <span className="text-sm text-zinc-400">Em quantas vezes?</span>
                                <Input
                                    name="installments"
                                    type="number"
                                    min="2"
                                    max="72"
                                    defaultValue="2"
                                    className="bg-zinc-950 border-zinc-800 w-24"
                                />
                            </div>
                        )}
                    </div>
                    {/* --- FIM DA ÁREA DE PARCELAMENTO --- */}

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}