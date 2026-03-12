// src/view/ui/credit-card-modal.tsx
"use client";

import { useState } from "react";
import { Plus, CreditCard } from "lucide-react";
import { Button } from "@/view/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/view/ui/dialog";
import { Input } from "@/view/ui/input";
import { addCreditCard } from "@/app/actions";

export function CreditCardModal() {
    const [open, setOpen] = useState(false);

    async function handleSubmit(formData: FormData) {
        const response = await addCreditCard(formData);

        if (response?.error) {
            alert(response.error);
            return;
        }

        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Cartão
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        Cadastrar Cartão de Crédito
                    </DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 uppercase tracking-wider">Nome do Cartão</label>
                        <Input name="name" placeholder="Ex: Nubank, Itaú Black" required className="bg-zinc-950 border-zinc-800" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400 uppercase tracking-wider">Dia de Fechamento</label>
                            <Input name="closingDay" type="number" min="1" max="31" placeholder="Ex: 25" required className="bg-zinc-950 border-zinc-800" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400 uppercase tracking-wider">Dia de Vencimento</label>
                            <Input name="dueDay" type="number" min="1" max="31" placeholder="Ex: 5" required className="bg-zinc-950 border-zinc-800" />
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-4">Salvar Cartão</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}