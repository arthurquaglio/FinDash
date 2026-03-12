// src/app/cartoes/page.tsx
import React from "react";
import { prisma } from "@/dados/prisma";
import { CreditCard as CardIcon, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/view/ui/card";
import { cookies } from "next/headers";
import { CreditCardModal } from "@/view/ui/credit-card-modal";
import { deleteCreditCard } from "@/app/actions";

export default async function CartoesPage() {
    // 1. Pega o usuário logado
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;
    const userFilter = activeProfileId ? { userId: activeProfileId } : {};

    // 2. Define o mês atual para calcular a fatura
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 3. Busca os cartões do usuário e já puxa as transações DENTRO deste mês
    const creditCards = await prisma.creditCard.findMany({
        where: { ...userFilter },
        include: {
            transactions: {
                where: {
                    date: {
                        gte: firstDayMonth,
                        lte: lastDayMonth,
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="p-4 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Cabeçalho */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <CardIcon className="w-6 h-6 text-blue-500"/>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                                Meus Cartões
                            </h1>
                            <p className="text-xs text-zinc-500">Controle suas faturas e limites.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <CreditCardModal />
                    </div>
                </header>

                {/* Grid de Cartões */}
                {creditCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {creditCards.map((card) => {
                            // Soma as transações do mês para montar a Fatura Atual
                            const currentInvoice = card.transactions.reduce((acc, curr) => acc + Math.abs(curr.value), 0);

                            // Cria a Action de Excluir vinculada a este ID
                            const deleteAction = deleteCreditCard.bind(null, card.id);

                            return (
                                <Card key={card.id} className="bg-zinc-900/50 border-zinc-800 relative group overflow-hidden">
                                    {/* Borda superior decorativa */}
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

                                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-bold text-zinc-100">{card.name}</CardTitle>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                                            </p>
                                        </div>

                                        {/* Botão de Excluir (Aparece no hover) */}
                                        <form action={async () => {
                                            "use server";
                                            await deleteCreditCard(card.id);
                                        }}>
                                            <button type="submit" className="p-2 rounded-md text-zinc-600 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </form>
                                    </CardHeader>

                                    <CardContent className="pt-4 border-t border-zinc-800/50 mt-2">
                                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Fatura Atual</p>
                                        <div className="text-3xl font-bold text-blue-400 font-mono">
                                            {currentInvoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-zinc-900/20 border border-zinc-800 border-dashed rounded-xl">
                        <CardIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-300">Nenhum cartão cadastrado</h3>
                        <p className="text-sm text-zinc-500 mt-1">Adicione seu primeiro cartão de crédito para gerenciar as faturas.</p>
                    </div>
                )}
            </div>
        </div>
    );
}