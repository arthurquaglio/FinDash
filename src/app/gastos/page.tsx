// src/app/gastos/page.tsx
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ReceiptText } from "lucide-react";
import Link from "next/link";
import { TransactionActions } from "@/components/transaction-actions";

export default async function GastosPage({
                                             searchParams,
                                         }: {
    searchParams: { q?: string; start?: string; end?: string };
}) {
    const query = searchParams.q || "";

    // Lógica de Datas:
    // Se houver start, define como início do dia (00:00).
    // Se houver end, define como fim do dia (23:59).
    const startDate = searchParams.start ? new Date(`${searchParams.start}T00:00:00`) : undefined;
    const endDate = searchParams.end ? new Date(`${searchParams.end}T23:59:59`) : undefined;

    // Busca filtrada no Prisma
    const transactions = await prisma.transaction.findMany({
        where: {
            // Busca por nome (se houver query)
            name: { contains: query, mode: "insensitive" },
            // Filtro de data dinâmico: se startDate/endDate forem undefined, o Prisma ignora o filtro
            date: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            },
        },
        include: { category: true, type: true },
        orderBy: { date: "desc" }, // Garante que os mais novos apareçam primeiro sempre
    });

    const types = await prisma.transactionType.findMany();
    const categories = await prisma.category.findMany();

    return (
        <div className="p-8 bg-zinc-950 min-h-screen text-zinc-100 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
                            <ReceiptText className="w-6 h-6 text-emerald-500" />
                            Extrato Completo
                        </h1>
                    </div>

                    {/* BARRA DE FILTROS INTELIGENTE */}
                    <form className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <Input
                                name="q"
                                defaultValue={query}
                                placeholder="Buscar descrição..."
                                className="pl-10 bg-zinc-950 border-zinc-800 w-[220px] focus:ring-emerald-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                name="start"
                                type="date"
                                defaultValue={searchParams.start}
                                className="bg-zinc-950 border-zinc-800 text-xs w-[140px]"
                            />
                            <span className="text-zinc-600 text-xs">até</span>
                            <Input
                                name="end"
                                type="date"
                                defaultValue={searchParams.end}
                                className="bg-zinc-950 border-zinc-800 text-xs w-[140px]"
                            />
                        </div>

                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6">
                            Filtrar
                        </Button>

                        {(query || searchParams.start || searchParams.end) && (
                            <Link href="/gastos">
                                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-200 gap-1">
                                    <X className="w-4 h-4" /> Limpar
                                </Button>
                            </Link>
                        )}
                    </form>
                </header>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-sm overflow-hidden">
                    <Table>
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
                            {transactions.length > 0 ? (
                                transactions.map((t) => (
                                    <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/40 transition-colors group">
                                        <TableCell className="text-zinc-400 font-mono text-sm">
                                            {new Date(t.date).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="font-semibold text-zinc-200">{t.name}</TableCell>
                                        <TableCell>
                      <span className="px-2 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                        {t.category.name}
                      </span>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono font-bold text-base ${t.value < 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                                            {t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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