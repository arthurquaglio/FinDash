// src/app/gastos/page.tsx
import { prisma } from "@/lib/prisma";
import { ReceiptText } from "lucide-react";
import { ImportCSV } from "@/components/import-csv";
import { Filters } from "@/components/ui/filters";
import { cookies } from "next/headers";
import { TransactionTableClient } from "@/components/transaction-table-client"; // <-- A SUA NOVA IMPORTAÇÃO AQUI!

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
                            <ImportCSV/>
                        </div>
                    </div>

                    <div className="w-full">
                        <Filters categories={categories}/>
                    </div>
                </header>

                {/* Olha como o código ficou limpo! O seu novo componente faz todo o trabalho pesado agora: */}
                <TransactionTableClient
                    transactions={transactions}
                    types={types}
                    categories={categories}
                />

            </div>
        </div>
    );
}