// src/components/ui/transaction-modal.tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addTransaction } from "@/app/actions";

// NOVO: Adicionamos bankAccounts nas propriedades do modal
export function TransactionModal({ types, categories, creditCards = [], bankAccounts = [] }: any) {
    const [open, setOpen] = useState(false);

    const [isInstallment, setIsInstallment] = useState(false);
    const [isFixed, setIsFixed] = useState(false);

    const handleInstallmentChange = (checked: boolean) => {
        setIsInstallment(checked);
        if (checked) setIsFixed(false);
    };

    const handleFixedChange = (checked: boolean) => {
        setIsFixed(checked);
        if (checked) setIsInstallment(false);
    };

    async function handleSubmit(formData: FormData) {
        const response = await addTransaction(formData);

        if (response?.error) {
            alert(response.error);
            return;
        }

        setOpen(false);
        setIsInstallment(false);
        setIsFixed(false);
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

                    <Input
                        name="value"
                        type="number"
                        step="0.01"
                        placeholder={isFixed ? "Valor da Mensalidade" : "Valor Total"}
                        required
                        className="bg-zinc-950 border-zinc-800"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input name="date" type="date" required className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                        <select name="typeId" required className="bg-zinc-950 border-zinc-800 rounded-md px-2 text-sm">
                            {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <select name="categoryId" required className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm">
                            <option value="" disabled selected hidden>Categoria...</option>
                            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* NOVO: Seletor de Conta Bancária */}
                        <select name="bankAccountId" required className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm text-zinc-300">
                            <option value="" disabled selected hidden>Conta Bancária...</option>
                            {bankAccounts.map((account: any) => (
                                <option key={account.id} value={account.id}>🏦 {account.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1">
                        {/* Seletor de Forma de Pagamento (Cartão ou Débito) */}
                        <select name="creditCardId" className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm text-zinc-300">
                            <option value="">Débito / Pix / Dinheiro</option>
                            {creditCards.map((card: any) => (
                                <option key={card.id} value={card.id}>💳 Cartão: {card.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* --- ÁREA DE OPÇÕES AVANÇADAS --- */}
                    <div className="flex flex-col gap-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg mt-2">

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-max">
                                <input
                                    type="checkbox"
                                    checked={isInstallment}
                                    onChange={(e) => handleInstallmentChange(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 accent-emerald-500"
                                />
                                Compra parcelada?
                            </label>

                            {isInstallment && (
                                <div className="flex items-center gap-3 ml-6 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm text-zinc-500">Em quantas vezes?</span>
                                    <Input name="installments" type="number" min="2" max="72" defaultValue="2" className="bg-zinc-950 border-zinc-800 w-20 h-8 text-sm" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 border-t border-zinc-800/50 pt-3">
                            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-max">
                                <input
                                    type="checkbox"
                                    checked={isFixed}
                                    onChange={(e) => handleFixedChange(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 accent-emerald-500"
                                />
                                Gasto fixo mensal?
                            </label>

                            {isFixed && (
                                <div className="flex items-center gap-3 ml-6 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm text-zinc-500">Projetar por quantos meses?</span>
                                    <Input name="fixedMonths" type="number" min="2" max="120" defaultValue="12" className="bg-zinc-950 border-zinc-800 w-20 h-8 text-sm" />
                                </div>
                            )}
                        </div>
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 mt-2">Salvar Transação</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}