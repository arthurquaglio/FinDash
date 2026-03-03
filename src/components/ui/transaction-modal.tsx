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

    async function handleSubmit(formData: FormData) {
        await addTransaction(formData);
        setOpen(false); // Fecha o modal após salvar
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
                    <Input name="value" type="number" step="0.01" placeholder="Valor" required className="bg-zinc-950 border-zinc-800" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="date" type="date" required className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                        <select name="typeId" required className="bg-zinc-950 border-zinc-800 rounded-md px-2 text-sm">
                            {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <select name="categoryId" required className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm">
                        {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}