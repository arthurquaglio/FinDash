// src/view/ui/bank-account-modal.tsx
"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/view/ui/dialog";
import { Button } from "@/view/ui/button";
import { Input } from "@/view/ui/input";
import { addBankAccount } from "@/app/actions";

export function BankAccountModal() {
    const [open, setOpen] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(formData: FormData) {
        setError("");
        const result = await addBankAccount(formData);

        if (result.error) {
            setError(result.error);
        } else {
            setOpen(false); // Fecha o modal no sucesso
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="min-w-[240px] bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl shrink-0 snap-start hover:bg-zinc-900/50 hover:border-zinc-700 transition-all cursor-pointer flex flex-col items-center justify-center p-5 group">
                    <PlusCircle className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-emerald-500 transition-colors" />
                    <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300">Nova Conta Bancária</p>
                </div>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50">
                <DialogHeader>
                    <DialogTitle>Adicionar Conta Bancária</DialogTitle>
                </DialogHeader>
                <form action={handleSubmit} className="space-y-4 pt-4">
                    {error && <p className="text-red-500 text-sm bg-red-500/10 p-2 rounded">{error}</p>}

                    <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Nome do Banco (ex: Nubank, Inter)</label>
                        <Input name="name" required placeholder="Digite o nome..." className="bg-zinc-900 border-zinc-800" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Saldo Inicial (R$)</label>
                        <Input name="initialValue" type="number" step="0.01" defaultValue="0" className="bg-zinc-900 border-zinc-800" />
                        <p className="text-xs text-zinc-500">Qual o saldo atual desta conta para iniciarmos?</p>
                    </div>

                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        Salvar Conta
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}