// src/app/page.tsx
import React from "react";
import { LayoutDashboard, Wallet, TrendingUp, Trash2, Target, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/view/ui/card";
import { Button } from "@/view/ui/button";
import { Input } from "@/view/ui/input";
import { TransactionModal } from "@/view/ui/transaction-modal";
import { DashboardCharts } from "@/view/ui/dashboard-charts";
import { BudgetSidebar } from "@/view/budget-sidebar";
import { GoalModal } from "@/view/ui/goal-modal";
import { cookies } from "next/headers";
import { PeriodToggle } from "@/view/period-toggle";
import { deleteBudget, deleteGoal, addMoneyToGoal } from "@/app/actions";
import { obterResumoFinanceiro } from "@/negocios/dashboardNegocios";
import { BankIcon } from "@/view/bank-icon";

/**
 * Interface visual principal do FinDash (Dashboard).
 * Atua estritamente como a Camada de View no padrão N-Tier, solicitando os dados à Camada de Negócios.
 * * @param searchParams - Parâmetros da URL para controle de período.
 * @returns Retorna a interface completa em JSX renderizada no servidor.
 */
export default async function FinanceDashboard({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  //#region 1. PREPARAÇÃO DE DADOS (VIA CAMADA DE NEGÓCIOS)
  const params = await searchParams;
  const isAllTime = params.periodo === "tudo";

  const cookieStore = await cookies();
  const activeProfileId = cookieStore.get("activeProfileId")?.value;

  // A View passa a responsabilidade para a BLL (que por sua vez chama a DAL)
  const dados = await obterResumoFinanceiro(activeProfileId, isAllTime);

  // Preparação de formatação visual
  const periodText = isAllTime ? "todo o período" : "do mês";
  const periodLabel = isAllTime ? "(Total)" : "(Mês)";

  const chartData = [
    { name: "Entradas", value: dados.totalReceitas, fill: "#60a5fa" },
    { name: "Gastos", value: dados.totalGastos, fill: "#f87171" },
    { name: "Investido", value: dados.investido, fill: "#3b82f6" },
  ];
  //#endregion

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
              <BudgetSidebar categories={dados.categorias} budgets={dados.orcamentosStatus} />
              <TransactionModal
                  types={dados.tipos}
                  categories={dados.categorias}
                  creditCards={dados.cartoesCredito}
                  bankAccounts={dados.contasBancarias}
              />
            </div>
          </header>

          <div className="mb-6 md:hidden">
            <PeriodToggle />
          </div>


          <div className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Minhas Contas
              <div className="text-xs text-zinc-500 font-normal normal-case">
                Total Geral: <strong className="text-emerald-400 text-sm pl-1">{dados.saldoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
              </div>
            </h2>

            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {dados.saldosPorConta.map(conta => (
                  <Card key={conta.id} className="min-w-[240px] bg-zinc-900 border-zinc-800 shrink-0 snap-start hover:border-zinc-700 transition-colors cursor-default">
                    <CardContent className="p-5 flex items-center gap-4">
                      <BankIcon bankName={conta.name} className="w-12 h-12 text-xl" />
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase">{conta.name}</p>
                        <p className="text-lg font-bold text-zinc-100 font-mono">
                          {conta.currentBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
              ))}

              <Card className="min-w-[240px] bg-zinc-900/30 border-zinc-800 border-dashed shrink-0 snap-start hover:bg-zinc-900/50 hover:border-zinc-700 transition-all cursor-pointer flex flex-col items-center justify-center p-5 group">
                <PlusCircle className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-emerald-500 transition-colors" />
                <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300">Nova Conta Bancária</p>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-4">
              <div className="p-2.5 bg-red-500/10 rounded-lg text-red-500"><TrendingUp className="w-5 h-5"/></div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Maior gasto {periodText}</p>
                <p className="text-sm text-zinc-200">
                  {dados.maiorGasto
                      ? `${dados.maiorGasto.name}: ${Math.abs(dados.maiorGasto.value).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`
                      : "Nenhum gasto registrado."}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-500"><LayoutDashboard className="w-5 h-5"/></div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Atenção aos Limites</p>
                <p className="text-sm text-zinc-200">
                  Você tem <strong>{dados.orcamentosStatus.filter(b => b.current > b.limit).length}</strong> categorias acima do limite.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card className="bg-zinc-900/50 border-zinc-800 h-full flex flex-col justify-center p-4">
                <DashboardCharts data={chartData}/>
              </Card>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
              <Card className="bg-zinc-900/50 border-zinc-800 flex-1 flex flex-col justify-center">
                <CardHeader className="pb-1"><CardTitle className="text-xs text-zinc-500 uppercase">Entradas {periodLabel}</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-blue-400 font-mono">R$ {dados.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 flex-1 flex flex-col justify-center">
                <CardHeader className="pb-1"><CardTitle className="text-xs text-zinc-500 uppercase">Saídas {periodLabel}</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-red-400 font-mono">R$ {dados.totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800 flex-1 flex flex-col justify-center">
                <CardHeader className="pb-1"><CardTitle className="text-xs text-zinc-500 uppercase">Investido {periodLabel}</CardTitle></CardHeader>
                <CardContent><div className="text-3xl font-bold text-emerald-500">R$ {dados.investido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></CardContent>
              </Card>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                Minhas Caixinhas
              </h2>
              <GoalModal />
            </div>

            {dados.metas.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dados.metas.map((goal) => {
                    const percent = (goal.currentAmount / goal.targetAmount) * 100;

                    return (
                        <Card key={goal.id} className="bg-zinc-900/50 border-zinc-800 group relative">
                          <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-zinc-100">{goal.name}</h3>
                                <p className="text-xs text-zinc-500 mt-1">
                                  {goal.currentAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} de {goal.targetAmount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                </p>
                              </div>
                              <form action={async () => {
                                "use server";
                                await deleteGoal(goal.id);
                              }}>
                                <button type="submit" className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </form>
                            </div>

                            <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
                              <div
                                  className="h-full bg-emerald-500 transition-all duration-500"
                                  style={{width: `${Math.min(percent, 100)}%`}}
                              />
                            </div>

                            <form action={async (formData) => {
                              "use server";
                              const val = Number(formData.get("amount"));
                              if(val > 0) await addMoneyToGoal(goal.id, val);
                            }} className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Guardar mais..." className="h-8 text-xs bg-zinc-950 border-zinc-800" />
                              <Button type="submit" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs text-white">Guardar</Button>
                            </form>
                          </CardContent>
                        </Card>
                    );
                  })}
                </div>
            ) : (
                <Card className="bg-zinc-900/20 border border-zinc-800 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Target className="w-8 h-8 text-zinc-700 mb-3" />
                    <p className="text-sm font-medium text-zinc-300">Nenhuma caixinha criada</p>
                    <p className="text-xs text-zinc-500 mt-1">Crie o seu primeiro objetivo para começar a poupar.</p>
                  </CardContent>
                </Card>
            )}
          </div>

          {dados.orcamentosStatus.length > 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 mb-8">
                <CardHeader><CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Limites de Gastos</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {dados.orcamentosStatus.map((b) => {
                    return (
                        <div key={b.categoryId} className="space-y-2 group">
                          <div className="flex justify-between items-center text-xs font-medium">
                            <span className="text-zinc-400">{b.category}</span>
                            <div className="flex items-center gap-3">
                                                <span className={b.percent > 90 ? "text-red-400 font-bold" : "text-zinc-300"}>
                                                    {b.current.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})} / {b.limit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                                </span>
                              <form action={async () => {
                                "use server";
                                await deleteBudget(b.categoryId);
                              }}>
                                <button type="submit" className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            </div>
                          </div>
                          <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${b.percent > 90 ? 'bg-red-500' : 'bg-rose-500'}`}
                                style={{width: `${Math.min(b.percent, 100)}%`}}
                            />
                          </div>
                        </div>
                    );
                  })}
                </CardContent>
              </Card>
          )}

          <Card className="bg-zinc-900/50 border-zinc-800 mb-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-orange-500/50 to-orange-400/20" />
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                Próximos Vencimentos (15 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dados.contasFuturas.length > 0 ? (
                  <div className="space-y-3">
                    {dados.contasFuturas.map((bill) => {
                      const billDate = new Date(bill.date);
                      const diffTime = billDate.getTime() - new Date().setHours(0,0,0,0);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      let dayText;
                      if (diffDays === 0) dayText = "Vence Hoje!";
                      else if (diffDays === 1) dayText = "Vence Amanhã";
                      else dayText = `Em ${diffDays} dias`;

                      return (
                          <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-md ${diffDays <= 3 ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                <Wallet className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-zinc-200">{bill.name}</p>
                                <p className={`text-[10px] font-bold uppercase ${diffDays <= 3 ? 'text-orange-400' : 'text-zinc-500'}`}>
                                  {dayText} • {billDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-sm text-zinc-300">
                              {Math.abs(bill.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </div>
                      );
                    })}
                  </div>
              ) : (
                  <p className="text-sm text-zinc-500 italic py-4 text-center">Nenhuma conta para os próximos 15 dias. Ufa!</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader><CardTitle className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Histórico Recente</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dados.transacoesPeriodo.slice(0, 10).map((t) => (
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