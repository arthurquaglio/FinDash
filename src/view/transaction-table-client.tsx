// src/view/transaction-table-client.tsx
"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/view/ui/table";
import { TransactionActions } from "@/view/transaction-actions";
import { deleteManyTransactions } from "@/app/actions";
import { Trash2 } from "lucide-react";
import { Button } from "@/view/ui/button";

// NOVO: Adicionado bankAccounts e creditCards nas props
export function TransactionTableClient({ transactions, types, categories, bankAccounts = [], creditCards = [] }: any) {
    // Guarda os IDs das transações selecionadas
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Marca/desmarca todas as transações da página atual
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(transactions.map((t: any) => t.id));
        } else {
            setSelectedIds([]);
        }
    };

    // Marca/desmarca apenas uma transação
    const handleSelectOne = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => [...prev, id]);
        } else {
            setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
        }
    };

    // Executa a ação de apagar no servidor
    const handleDeleteSelected = async () => {
        if (!confirm(`Tem a certeza que deseja apagar ${selectedIds.length} transação(ões)?`)) return;

        setIsDeleting(true);
        const response = await deleteManyTransactions(selectedIds);

        if (response?.error) {
            alert(response.error);
        } else {
            setSelectedIds([]); // Limpa a seleção após o sucesso
        }
        setIsDeleting(false);
    };

    return (
        <div className="space-y-4">
            {/* Barra de Ação de Apagar (Só aparece se houver checkboxes marcadas) */}
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in">
                    <span className="text-sm font-medium text-red-400">
                        {selectedIds.length} transação(ões) selecionada(s)
                    </span>
                    <Button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 h-8 text-xs"
                    >
                        <Trash2 className="w-4 h-4" />
                        {isDeleting ? "A apagar..." : "Apagar Selecionados"}
                    </Button>
                </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-sm overflow-x-auto">
                <Table className="min-w-[600px]">
                    <TableHeader className="bg-zinc-900/60">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            {/* Novo: Checkbox do Cabeçalho */}
                            <TableHead className="w-[50px] text-center">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 accent-emerald-500 cursor-pointer"
                                    checked={transactions.length > 0 && selectedIds.length === transactions.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                            </TableHead>
                            <TableHead className="text-zinc-400 font-bold py-4">Data</TableHead>
                            <TableHead className="text-zinc-400 font-bold">Descrição</TableHead>
                            <TableHead className="text-zinc-400 font-bold">Categoria</TableHead>
                            <TableHead className="text-zinc-400 font-bold text-right">Valor</TableHead>
                            <TableHead className="text-zinc-400 font-bold text-right pr-6">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length > 0 ? (
                            transactions.map((t: any) => (
                                <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors group">
                                    {/* Novo: Checkbox da Linha */}
                                    <TableCell className="text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 accent-emerald-500 cursor-pointer"
                                            checked={selectedIds.includes(t.id)}
                                            onChange={(e) => handleSelectOne(t.id, e.target.checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-zinc-400 font-mono text-sm whitespace-nowrap">
                                        {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </TableCell>
                                    <TableCell className="font-semibold text-zinc-200">{t.name}</TableCell>
                                    <TableCell>
                                        <span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                                        {t.category.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`text-right font-mono font-bold text-base whitespace-nowrap ${t.value < 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                                        {t.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        {/* ATUALIZADO: Repassando bankAccounts e creditCards */}
                                        <TransactionActions
                                            transaction={t}
                                            types={types}
                                            categories={categories}
                                            bankAccounts={bankAccounts}
                                            creditCards={creditCards}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-zinc-500 italic">
                                    Nenhuma transação encontrada para este filtro.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}