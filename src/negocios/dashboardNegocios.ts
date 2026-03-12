// src/negocios/dashboardNegocios.ts
import { buscarDadosCompletosDashboardDb } from "@/dados/dashboardDados";

//#region DASHBOARD BLL (Business Logic Layer)
/**
 * Orquestra e processa os dados financeiros do usuário para o Dashboard.
 * Esta função NÃO acessa a base de dados diretamente; ela delega a leitura à camada de Dados
 * e aplica as regras de negócio (matemática de saldos, separação por contas, limites de orçamento).
 * @param userId - O identificador único do perfil logado (ex: ID do Arthur ou da Flávia).
 * @param isAllTime - Variável de controle do filtro de data da tela.
 * @returns Retorna um objeto consolidado (DTO) pronto para a View renderizar.
 */
export async function obterResumoFinanceiro(userId: string | undefined, isAllTime: boolean) {
    //#region 1. Delegação para a Camada de Dados (DAL)
    const dadosBrutos = await buscarDadosCompletosDashboardDb(userId, isAllTime);
    //#endregion

    //#region 2. Cálculos Globais (Dashboard Resumo)
    const gastosMes = dadosBrutos.transacoesPeriodo.filter(t => t.type.name === "Gasto");
    const receitasMes = dadosBrutos.transacoesPeriodo.filter(t => t.type.name === "Receita");

    const totalGastos = gastosMes.reduce((acc, curr) => acc + Math.abs(curr.value), 0);
    const totalReceitas = receitasMes.reduce((acc, curr) => acc + curr.value, 0);

    // Matemática corrigida de investimentos (Aplicações - Resgates)
    const totalInvestedBruto = dadosBrutos.transacoesPeriodo
        .filter(t => t.type.name === "Investimento" || t.type.name === "Renda Fixa")
        .reduce((acc, curr) => acc + curr.value, 0);
    const investido = Math.abs(totalInvestedBruto);

    const maiorGasto = gastosMes.length > 0
        ? gastosMes.reduce((prev, curr) => (Math.abs(prev.value) > Math.abs(curr.value)) ? prev : curr)
        : null;
    //#endregion

    //#region 3. Cálculos Individuais por Conta (Nova Feature)
    // Cria um array dinâmico com o saldo consolidado de cada conta do usuário
    const saldosPorConta = dadosBrutos.contasBancarias.map(conta => {
        // Separa as transações que pertencem exclusivamente a esta conta (usando todo o histórico)
        const transacoesDestaConta = dadosBrutos.todasTransacoesUser.filter(t => t.bankAccountId === conta.id);

        // Soma as movimentações (Entradas, Saídas, Transferências) partindo do saldo inicial
        const saldoDaConta = transacoesDestaConta.reduce((acc, curr) => acc + curr.value, conta.initialValue || 0);

        return {
            id: conta.id,
            name: conta.name,
            currentBalance: saldoDaConta
        };
    });
    //#endregion

    //#region 4. Validação de Orçamentos (Budgets)
    // Recalcula o status da barra de progresso de cada orçamento
    const orcamentosStatus = dadosBrutos.orcamentos.map(b => {
        const spent = dadosBrutos.transacoesPeriodo
            .filter(t => t.categoryId === b.categoryId && t.value < 0)
            .reduce((acc, curr) => acc + curr.value, 0);

        const currentSpent = Math.abs(spent);
        return {
            categoryId: b.categoryId,
            category: b.category?.name || "Sem categoria",
            limit: b.amount,
            current: currentSpent,
            percent: (currentSpent / b.amount) * 100
        };
    });
    //#endregion

    //#region 5. Retorno Consolidado para a View
    return {
        totalReceitas,
        totalGastos,
        investido,
        categorias: dadosBrutos.categorias,
        orcamentosStatus,
        tipos: dadosBrutos.tipos,
        cartoesCredito: dadosBrutos.cartoesCredito,
        contasBancarias: dadosBrutos.contasBancarias,
        saldoTotal: dadosBrutos.saldoTotalGlobal,
        saldosPorConta,
        maiorGasto,
        metas: dadosBrutos.metas,
        contasFuturas: dadosBrutos.contasFuturas,
        transacoesPeriodo: dadosBrutos.transacoesPeriodo
    };
    //#endregion
}
//#endregion