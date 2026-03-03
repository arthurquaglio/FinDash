// src/app/gastos/page.tsx
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptText } from "lucide-react";
import { TransactionActions } from "@/components/transaction-actions";
import { ImportCSV } from "@/components/import-csv";
import { Filters } from "@/components/ui/filters";
import { cookies } from "next/headers";

export default async function GastosPage({
                                             searchParams,
                                         }: {
    // 1. CORREÇÃO: No Next.js novo, searchParams é uma Promise!
    searchParams: Promise<{ q?: string; category?: string; start?: string; end?: string }>;
}) {
    // Resolvemos a Promise dos parâmetros da URL primeiro
    const params = await searchParams;

    // 2. LER O PERFIL ATUAL
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    // 3. CRIAR O FILTRO DE USUÁRIO
    const userFilter = activeProfileId ? { userId: activeProfileId } : {};

    // Garantimos que os valores sejam strings ou undefined a partir do 'params' resolvido
    const query = params.q || "";
    const categoryId = params.category || "";
    const start = params.start || "";
    const end = params.end || "";

    // 4. CORREÇÃO: Montamos o filtro de data de forma segura para o Prisma não travar
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
            date: dateFilter, // <-- Usamos o filtro seguro aqui!
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
                    {/* ... (Seu cabeçalho continua igual) ... */}
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

                {/* 5. CORREÇÃO MOBILE: Troquei overflow-hidden por overflow-x-auto */}
                {/* Isso permite que você arraste a tabela para o lado no celular sem quebrar a tela! */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-sm overflow-x-auto">
                    <Table className="min-w-[600px]"> {/* min-w garante que as colunas não fiquem esmagadas */}
                        <TableHeader className="bg-zinc-900/60">
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                                <TableHead className="text-zinc-400 font-bold py-4">Data</TableHead>
                                <TableHead className="text-zinc-400 font-bold">Descrição</TableHead>
                                <TableHead className="text-zinc-400 font-bold">Categoria</TableHead>
                                <TableHead className="text-zinc-400 font-bold text-right">Valor</TableHead>
                                <TableHead className="text-zinc-400 font-bold text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* ... (O resto do seu mapeamento da tabela continua igual) ... */}
                            {transactions.length > 0 ? (
                                transactions.map((t) => (
                                    <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors group">
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
                                            <TransactionActions
                                                transaction={t}
                                                types={types}
                                                categories={categories}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-zinc-500 italic">
                                        Nenhuma transação encontrada para este filtro.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}