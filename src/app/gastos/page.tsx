// src/app/gastos/page.tsx
import { prisma } from "@/dados/prisma";
import { ReceiptText } from "lucide-react";
import { ImportOFX } from "@/view/import-ofx";
import { Filters } from "@/view/ui/filters";
import { cookies } from "next/headers";
import { TransactionTableClient } from "@/view/transaction-table-client";

export default async function GastosPage({
                                             searchParams,
                                         }: {
    searchParams: Promise<{ q?: string; category?: string; start?: string; end?: string }>;
}) {
    // Resolvemos a Promise dos parâmetros da URL primeiro
    const params = await searchParams;

    // LER O PERFIL ATUAL
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    // CRIAR O FILTRO DE USUÁRIO
    const userFilter = activeProfileId ? { userId: activeProfileId } : {};

    const userCreditCards = await prisma.creditCard.findMany({
        where: userFilter
    });

    // NOVO: Busca as contas bancárias do usuário
    const userBankAccounts = await prisma.bankAccount.findMany({
        where: userFilter
    });

    // Garantimos que os valores sejam strings ou undefined a partir do 'params' resolvido
    const query = params.q || "";
    const categoryId = params.category || "";
    const start = params.start || "";
    const end = params.end || "";

    // Montamos o filtro de data de forma segura para o Prisma não travar
    const dateFilter = start || end ? {
        ...(start ? { gte: new Date(`${start}T00:00:00`) } : {}),
        ...(end ? { lte: new Date(`${end}T23:59:59`) } : {}),
    } : undefined;

    const transactions = await prisma.transaction.findMany({
        where: {
            ...userFilter,
            name: query ? {
                contains: query,
                mode: "insensitive",
            } : undefined,
            categoryId: categoryId ? categoryId : undefined,
            date: dateFilter,
        },
        include: { category: true, type: true },
        orderBy: { date: "desc" },
    });

    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    const types = await prisma.transactionType.findMany();

    return (
        <div className="p-4 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col gap-8 mb-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <ReceiptText className="w-6 h-6 text-emerald-500"/>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                                    Extrato Completo
                                </h1>
                                <p className="text-xs text-zinc-500">Visualize e gerencie suas transações importadas.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* ATUALIZADO: Passando bankAccounts para o importador */}
                            <ImportOFX
                                categories={categories}
                                creditCards={userCreditCards}
                                bankAccounts={userBankAccounts}
                            />
                        </div>
                    </div>

                    <div className="w-full">
                        <Filters categories={categories}/>
                    </div>
                </header>

                {/* ATUALIZADO: Passando as contas e os cartões para a tabela */}
                <TransactionTableClient
                    transactions={transactions}
                    types={types}
                    categories={categories}
                    bankAccounts={userBankAccounts}
                    creditCards={userCreditCards}
                />

            </div>
        </div>
    );
}