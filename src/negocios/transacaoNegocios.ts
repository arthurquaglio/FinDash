// src/negocios/transacaoNegocios.ts
import {
    criarTransacaoDb,
    atualizarTransacaoDb,
    excluirTransacaoDb,
    excluirMultiplasTransacoesDb,
    atualizarCategoriaTransacaoDb,
    buscarTipoTransacaoDb
} from "@/dados/transacaoDados";

/**
 * Processa as regras de negócio para a criação de uma nova transação.
 * * @param dadosBrutos - Os dados crus enviados pelo formulário da interface.
 * @returns Um objeto indicando `{ sucesso: true }` ou `{ erro: "Mensagem amigável" }`.
 */
export async function processarNovaTransacao(dadosBrutos: any) {
    try {
        // 1. Regras de Negócio / Validações
        if (!dadosBrutos.name || dadosBrutos.name.trim() === "") {
            return { erro: "O nome da transação é obrigatório." };
        }

        if (!dadosBrutos.value || dadosBrutos.value === 0) {
            return { erro: "O valor da transação não pode ser zero." };
        }

        if (!dadosBrutos.categoryId || !dadosBrutos.typeId) {
            return { erro: "Categoria e Tipo são obrigatórios." };
        }

        // 2. Preparar o modelo (DTO) para enviar para o Banco de Dados
        const transacaoMapeada = {
            name: dadosBrutos.name,
            value: Number(dadosBrutos.value),
            date: new Date(dadosBrutos.date),
            categoryId: dadosBrutos.categoryId,
            typeId: dadosBrutos.typeId,
            userId: dadosBrutos.userId,
            bankAccountId: dadosBrutos.bankAccountId || null,
            creditCardId: dadosBrutos.creditCardId || null,
        };

        // 3. Chamar a camada de Dados
        const transacaoSalva = await criarTransacaoDb(transacaoMapeada);

        // 4. Retornar sucesso para a Action
        return { sucesso: true, dados: transacaoSalva };

    } catch (error: any) {
        // Se a camada de Dados estourar um throw, cai aqui!
        console.error("[NEGÓCIOS] Violação de regra ao criar transação:", error.message);
        return { erro: "Não foi possível salvar a transação. Verifique os dados e tente novamente." };
    }
}

//#region REGRAS DE UPDATE
/**
 * Processa a atualização de uma transação garantindo a matemática de sinais.
 */
export async function processarAtualizacaoTransacao(id: string, dadosBrutos: any) {
    try {
        if (!id) return { erro: "ID da transação é inválido." };

        // 1. Regra Matemática de Sinal (Dependendo se é Receita ou Gasto)
        const rawValue = Number(dadosBrutos.value);
        const type = await buscarTipoTransacaoDb(dadosBrutos.typeId);

        if (!type) return { erro: "Tipo de transação não encontrado no sistema." };

        const finalValue = type.name === "Receita" ? Math.abs(rawValue) : -Math.abs(rawValue);

        // 2. Mapeamento (DTO)
        const transacaoMapeada = {
            name: dadosBrutos.name,
            value: finalValue,
            date: new Date(`${dadosBrutos.date}T12:00:00Z`),
            typeId: dadosBrutos.typeId,
            categoryId: dadosBrutos.categoryId,
            ...(dadosBrutos.bankAccountId !== undefined && { bankAccountId: dadosBrutos.bankAccountId === "" ? null : dadosBrutos.bankAccountId })
        };

        // 3. Persistência
        await atualizarTransacaoDb(id, transacaoMapeada);
        return { sucesso: true };

    } catch (error: any) {
        console.error("[NEGÓCIOS]", error.message);
        return { erro: "Falha ao atualizar a transação. Verifique os dados." };
    }
}

/**
 * Validação simples para troca rápida de categoria.
 */
export async function processarAtualizacaoCategoria(transactionId: string, categoryId: string) {
    try {
        if (!transactionId || !categoryId) return { erro: "Dados inválidos para atualizar a categoria." };
        await atualizarCategoriaTransacaoDb(transactionId, categoryId);
        return { sucesso: true };
    } catch (error) {
        return { erro: "Não foi possível trocar a categoria no momento." };
    }
}
//#endregion

//#region REGRAS DE DELETE
export async function processarExclusaoTransacao(id: string) {
    try {
        if (!id) return { erro: "O identificador da transação é obrigatório." };
        await excluirTransacaoDb(id);
        return { sucesso: true };
    } catch (error: any) {
        return { erro: "Não foi possível apagar a transação. Tente novamente mais tarde." };
    }
}

export async function processarExclusaoEmMassa(ids: string[], userId: string) {
    try {
        if (!ids || ids.length === 0) return { erro: "Nenhuma transação foi selecionada para exclusão." };
        if (!userId) return { erro: "Erro de segurança: Perfil não identificado." };

        await excluirMultiplasTransacoesDb(ids, userId);
        return { sucesso: true };
    } catch (error: any) {
        return { erro: "Falha de segurança ao apagar múltiplas transações." };
    }
}
//#endregion