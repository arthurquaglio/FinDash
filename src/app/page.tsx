// src/app/page.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { LayoutDashboard, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/components/ui/transaction-modal";
import { DashboardCharts } from "@/components/ui/dashboard-charts";
import Link from "next/link";
import { BudgetSidebar } from "@/components/budget-sidebar";
import { cookies } from "next/headers";
import { PeriodToggle } from "@/components/period-toggle";

export default async function FinanceDashboard({
                                                 searchParams,
                                               }: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const params = await searchParams;
  const isAllTime = params.periodo === "tudo";

  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("activeProfileId")?.value;
  const userFilter = activeProfileId ? { userId: activeProfileId } : {};

  const now = new Date();
  const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const dateFilter = isAllTime ? {} : {
    date: {
      gte: firstDayMonth,
      lte: lastDayMonth,
    }
  };

  const allBudgets = await prisma.budget.findMany({
    where: { ...userFilter },
    include: { category: true }
  });

  const types = await prisma.transactionType.findMany();

  const allCategories = await prisma.category.findMany({
    include: { budgets: true }
  });

  const periodTransactions = await prisma.transaction.findMany({
    where: {
      ...userFilter,
      ...dateFilter
    },
    include: { type: true, category: true },
    orderBy: { date: 'desc' },
  });

  const expensesTransactions = periodTransactions.filter(t => t.type.name === "Gasto");

  // NOVO: Filtra as transações de entrada (Receita)
  const incomeTransactions = periodTransactions.filter(t => t.type.name === "Receita");

  const highestExpense = expensesTransactions.length > 0
      ? expensesTransactions.reduce((prev, curr) =>
          (Math.abs(prev.value) > Math.abs(curr.value)) ? prev : curr)
      : null;

  const budgetStatus = await Promise.all(
      allBudgets.map(async (b: any) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            ...userFilter,
            categoryId: b.categoryId,
            ...dateFilter,
            value: { lt: 0 }
          },
          _sum: { value: true }
        });

        const currentSpent = Math.abs(spent._sum.value || 0);
        return {
          category: b.category?.name || "Sem categoria",
          limit: b.amount,
          current: currentSpent,
          percent: (currentSpent / b.amount) * 100
        };
      })
  );

  const totalBalance = periodTransactions.reduce((acc, curr) => acc + curr.value, 0);
  const periodExpenses = expensesTransactions.reduce((acc, curr) => acc + Math.abs(curr.value), 0);

  // NOVO: Soma todas as entradas do período
  const periodIncome = incomeTransactions.reduce((acc, curr) => acc + curr.value, 0);

  const totalInvested = periodTransactions
      .filter(t => t.type.name === "Investimento")
      .reduce((acc, curr) => acc + Math.abs(curr.value), 0);

  const chartData = [
    { name: "Gastos", value: periodExpenses, fill: "#f87171" },
    { name: "Investido", value: totalInvested, fill: "#3b82f6" },
    { name: "Saldo", value: totalBalance > 0 ? totalBalance : 0, fill: "#10b981" },
  ];

  const recentTransactions = periodTransactions.slice(0, 10);

  const periodText = isAllTime ? "todo o período" : "do mês";
  const periodLabel = isAllTime ? "(Total)" : "(Mês)";

  return (
      <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-sans">
        <main className="flex-1 p-8 overflow-y-auto">
          <header className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Visão Geral</h1>
              <p className="text-sm text-zinc-500 mt-1">Nossas finanças bem organizadas para o futuro.</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="mr-4 hidden md:block">
                <PeriodToggle />
              </div>
              <BudgetSidebar categories={allCategories} budgets={allBudgets}/>
              <TransactionModal types={types} categories={allCategories}/>
            </div>
          </header>

          <div className="mb-6 md:hidden">
            <PeriodToggle />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-4">
              <div className="p-2.5 bg-red-500/10 rounded-lg text-red-500"><TrendingUp className="w-5 h-5"/></div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Maior gasto {periodText}</p>
                <p className="text-sm text-zinc-200">
                  {highestExpense
                      ? `${highestExpense.name}: ${Math.abs(highestExpense.value).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`
                      : "Nenhum gasto registrado."}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500"><LayoutDashboard className="w-5 h-5"/></div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Atenção às Metas</p>
                <p className="text-sm text-zinc-200">
                  Você tem <strong>{budgetStatus.filter(b => b.current > b.limit).length}</strong> categorias acima do limite.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <DashboardCharts data={chartData}/>
            </div>
            <div className="lg:col-span-1 space-y-4"> {/* Ajustei o space-y para 4 para caberem os 3 cards melhor */}

              {/* NOVO: Card de Entradas */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-zinc-500 uppercase">Entradas {periodLabel}</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-blue-400 font-mono">R$ {periodIncome.toLocaleString('pt-BR')}</div></CardContent>
              </Card>

              {/* Card de Saídas */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-zinc-500 uppercase">Saídas {periodLabel}</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-red-400 font-mono">R$ {periodExpenses.toLocaleString('pt-BR')}</div></CardContent>
              </Card>

              {/* Card de Saldo */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-zinc-500 uppercase">Saldo {periodLabel}</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-emerald-500">R$ {totalBalance.toLocaleString('pt-BR')}</div></CardContent>
              </Card>

            </div>
          </div>

          {budgetStatus.length > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
                <CardHeader><CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Acompanhamento de Metas</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {budgetStatus.map((b) => (
                      <div key={b.category} className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-zinc-400">{b.category}</span>
                          <span className={b.percent > 90 ? "text-red-400 font-bold" : "text-zinc-300"}>
                          {b.current.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} / {b.limit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                        </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                              className={`h-full transition-all duration-500 ${b.percent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                              style={{width: `${Math.min(b.percent, 100)}%`}}
                          />
                        </div>
                      </div>
                  ))}
                </CardContent>
              </Card>
          )}

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader><CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Histórico Recente</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">{t.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">{t.category.name} • {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-mono font-bold ${t.value > 0 ? 'text-emerald-500' : 'text-zinc-100'}`}>
                          {t.value > 0 ? '+' : ''}{t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
  );
}