// src/dados/dashboardDados.ts
import { prisma } from "@/dados/prisma";

//#region DASHBOARD DAL (Data Access Layer)
/**
 * Executa todas as leituras necessárias no banco de dados para montar o Dashboard.
 * * @param userId - ID do perfil logado.
 * @param userId
 * @param isAllTime - Filtro para definir se busca todo o histórico ou apenas o mês atual.
 * @returns Retorna os dados crus (raw) do Prisma.
 */
export async function buscarDadosCompletosDashboardDb(userId: string | undefined, isAllTime: boolean) {
    const userFilter = userId ? { userId } : {};

    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const dateFilter = isAllTime ? {} : {
        date: { gte: firstDayMonth, lte: lastDayMonth }
    };

    // Buscas em Paralelo para não travar o carregamento da tela
    const [
        contasBancarias,
        cartoesCredito,
        metas,
        orcamentos,
        categorias,
        tipos,
        transacoesPeriodo,
        todasTransacoesUser, // Necessário para calcular o saldo global histórico das contas
        contasFuturas,
        saldoGlobalResult
    ] = await Promise.all([
        prisma.bankAccount.findMany({ where: userFilter }),
        prisma.creditCard.findMany({ where: userFilter }),
        prisma.goal.findMany({ where: userFilter, orderBy: { name: 'asc' } }),
        prisma.budget.findMany({ where: userFilter, include: { category: true } }),
        prisma.category.findMany({ include: { budgets: true } }),
        prisma.transactionType.findMany(),
        prisma.transaction.findMany({
            where: { ...userFilter, ...dateFilter },
            include: { type: true, category: true },
            orderBy: { date: 'desc' }
        }),
        prisma.transaction.findMany({ where: userFilter }),
        prisma.transaction.findMany({
            where: {
                ...userFilter,
                date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lte: new Date(new Date().setDate(new Date().getDate() + 15))
                },
                type: { name: "Gasto" }
            },
            include: { category: true },
            orderBy: { date: 'asc' },
            take: 5
        }),
        prisma.transaction.aggregate({
            where: { ...userFilter, creditCardId: null },
            _sum: { value: true }
        })
    ]);

    return {
        contasBancarias, cartoesCredito, metas, orcamentos, categorias, tipos,
        transacoesPeriodo, todasTransacoesUser, contasFuturas,
        saldoTotalGlobal: saldoGlobalResult._sum.value || 0
    };
}
//#endregion