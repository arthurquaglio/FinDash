"use client";

import { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/view/ui/button";
import { deleteTransaction, updateTransaction } from "@/app/actions";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/view/ui/alert-dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/view/ui/sheet";
import { Input } from "@/view/ui/input";

// NOVO: Adicionado bankAccounts e creditCards nas propriedades
export function TransactionActions({ transaction, types, categories, bankAccounts = [], creditCards = [] }: any) {
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    // Formata a data para o input tipo 'date' (yyyy-mm-dd)
    const defaultDate = new Date(transaction.date).toISOString().split('T')[0];

    return (
        <div className="flex justify-end gap-2">
            {/* MODAL DE ATUALIZAR (SHEET) */}
            <Sheet open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-blue-400">
                        <Pencil className="w-4 h-4" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SheetHeader>
                        <SheetTitle className="text-zinc-100" >Editar Transação</SheetTitle>
                    </SheetHeader>
                    <form
                        action={async (formData) => {
                            await updateTransaction(transaction.id, formData);
                            setIsUpdateOpen(false);
                        }}
                        className="grid gap-4 py-6"
                    >
                        <Input name="name" defaultValue={transaction.name} placeholder="Nome" className="bg-zinc-950 border-zinc-800" />
                        <Input name="value" type="number" step="0.01" defaultValue={Math.abs(transaction.value)} placeholder="Valor" className="bg-zinc-950 border-zinc-800" />
                        <Input name="date" type="date" defaultValue={defaultDate} className="bg-zinc-950 border-zinc-800" />

                        <div className="grid grid-cols-2 gap-2">
                            <select name="typeId" defaultValue={transaction.typeId} className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm w-full">
                                {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>

                            <select name="categoryId" defaultValue={transaction.categoryId} className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm w-full">
                                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* NOVO: Seletor de Conta Bancária na Edição */}
                        <select name="bankAccountId" defaultValue={transaction.bankAccountId || ""} className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm text-zinc-300 w-full">
                            <option value="">Nenhuma Conta Bancária</option>
                            {bankAccounts.map((account: any) => (
                                <option key={account.id} value={account.id}>🏦 {account.name}</option>
                            ))}
                        </select>

                        <select name="creditCardId" defaultValue={transaction.creditCardId || ""} className="bg-zinc-950 border-zinc-800 rounded-md h-10 px-2 text-sm text-zinc-300 w-full">
                            <option value="">Débito / Pix / Dinheiro</option>
                            {creditCards.map((card: any) => (
                                <option key={card.id} value={card.id}>💳 {card.name}</option>
                            ))}
                        </select>

                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 mt-2">Salvar Alterações</Button>
                    </form>
                </SheetContent>
            </Sheet>

            {/* ALERTA DE EXCLUSÃO */}
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação "{transaction.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTransaction(transaction.id)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Confirmar Exclusão
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}