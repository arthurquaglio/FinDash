// src/dados/dashboardDados.ts
import { prisma } from "@/dados/prisma";

export async function buscarDadosDoDashboardDb(userId: string, dataInicio: Date, dataFim: Date) {
    // Procura todas as contas bancárias do usuário
    const contasBancarias = await prisma.bankAccount.findMany({
        where: { userId }
    });

    // Procura todas as transações do mês para fazer a matemática
    const transacoesMes = await prisma.transaction.findMany({
        where: {
            userId,
            date: {
                gte: dataInicio,
                lte: dataFim,
            }
        },
        include: {
            type: true,
            category: true,
            bankAccount: true // Precisamos saber de qual conta a transação saiu!
        }
    });

    // Traz também as metas e orçamentos para preencher os outros componentes
    const metas = await prisma.goal.findMany({ where: { userId } });
    const orcamentos = await prisma.budget.findMany({ where: { userId }, include: { category: true } });

    return { contasBancarias, transacoesMes, metas, orcamentos };
}