// src/negocios/transacaoNegocios.ts
import { criarTransacaoDb } from "@/dados/transacaoDados";

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