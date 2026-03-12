// src/negocios/dashboardNegocios.ts
import { buscarDadosDoDashboardDb } from "@/dados/dashboardDados";

//#region DASHBOARD BLL (Business Logic Layer)
/**
 * Orquestra e processa os dados financeiros do usuário para um período específico.
 * Esta função não acessa o banco de dados diretamente; ela delega a leitura à camada de Dados
 * e aplica as regras de negócio (matemática de saldos, separação por contas, consolidação).
 * * @param userId - O identificador único do perfil logado (ex: ID do Arthur ou da Flávia).
 * @param userId
 * @param dataInicio - A data inicial do filtro de período selecionado.
 * @param dataFim - A data final do filtro de período selecionado.
 * @returns Retorna um objeto consolidado (DTO) com os resumos globais, saldos por conta, e listas auxiliares. Retorna null se o usuário não for fornecido.
 */
export async function obterResumoFinanceiroDoMes(userId: string, dataInicio: Date, dataFim: Date) {
    //#region 1. Validação e Busca de Dados (DAL)
    if (!userId) return null;

    // A Camada de Negócios pede os dados brutos à Camada de Dados
    const { contasBancarias, transacoesMes, metas, orcamentos } = await buscarDadosDoDashboardDb(userId, dataInicio, dataFim);
    //#endregion

    //#region 2. Cálculos Globais (Dashboard Resumo)
    const receitas = transacoesMes
        .filter(t => t.type.name === "Receita")
        .reduce((acc, curr) => acc + curr.value, 0);

    const gastos = transacoesMes
        .filter(t => t.type.name === "Gasto")
        .reduce((acc, curr) => acc + Math.abs(curr.value), 0);

    // Matemática corrigida de investimentos (Aplicações - Resgates)
    const totalInvestedBruto = transacoesMes
        .filter(t => t.type.name === "Investimento" || t.type.name === "Renda Fixa")
        .reduce((acc, curr) => acc + curr.value, 0);
    const investido = Math.abs(totalInvestedBruto);
    //#endregion

    //#region 3. Cálculos Individuais por Conta (Nova Feature)
    // Cria um array dinâmico com o saldo consolidado de cada conta do usuário
    const saldosPorConta = contasBancarias.map(conta => {
        // Separa as transações que pertencem exclusivamente a esta conta
        const transacoesDestaConta = transacoesMes.filter(t => t.bankAccountId === conta.id);

        // Soma as movimentações (Entradas, Saídas, Transferências) partindo do saldo inicial da conta
        const saldoDaConta = transacoesDestaConta.reduce((acc, curr) => acc + curr.value, conta.initialValue || 0);

        return {
            id: conta.id,
            nome: conta.name,
            saldo: saldoDaConta
        };
    });

    // O Saldo Total global é a soma de todas as movimentações do período
    // (Inclui dinheiro vivo/carteira que pode não estar atrelado a uma conta bancária específica)
    const saldoTotal = transacoesMes.reduce((acc, curr) => acc + curr.value, 0);
    //#endregion

    //#region 4. Retorno Consolidado para a View
    return {
        resumo: { receitas, gastos, investido, saldoTotal },
        saldosPorConta,
        transacoesMes,
        metas,
        orcamentos
    };
    //#endregion
}
//#endregion