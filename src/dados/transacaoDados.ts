// src/dados/transacaoDados.ts
import { prisma } from "@/dados/prisma"; // Ajuste o caminho se o seu ficheiro prisma.ts tiver outro nome

/**
 * Insere fisicamente uma nova transação no banco de dados.
 * @param dados - Objeto contendo as propriedades da transação a ser salva.
 * @returns Retorna a entidade Transação recém-criada.
 * @throws Lança um erro se a conexão com o banco falhar.
 */
export async function criarTransacaoDb(dados: any) {
    try {
        return await prisma.transaction.create({
            data: dados,
        });
    } catch (error) {
        // Log interno para o programador ver no servidor
        console.error("[DADOS] Falha ao executar INSERT na tabela Transaction:", error);
        throw new Error("Erro de infraestrutura ao gravar no banco de dados.");
    }
}
//#region UPDATE & DELETE
/**
 * Atualiza fisicamente uma transação existente.
 * @param id - O ID da transação.
 * @param dados - Objeto DTO com os novos dados.
 */
export async function atualizarTransacaoDb(id: string, dados: any) {
    try {
        return await prisma.transaction.update({
            where: { id },
            data: dados,
        });
    } catch (error) {
        console.error("[DADOS] Falha ao atualizar Transaction:", error);
        throw new Error("Erro de infraestrutura ao atualizar no banco de dados.");
    }
}

/**
 * Atualiza apenas a categoria de uma transação.
 */
export async function atualizarCategoriaTransacaoDb(id: string, categoryId: string) {
    try {
        return await prisma.transaction.update({
            where: { id },
            data: { categoryId }
        });
    } catch (error) {
        throw new Error("Erro de infraestrutura ao atualizar categoria.");
    }
}

/**
 * Exclui fisicamente uma transação.
 */
export async function excluirTransacaoDb(id: string) {
    try {
        return await prisma.transaction.delete({
            where: { id },
        });
    } catch (error) {
        console.error("[DADOS] Falha ao excluir Transaction:", error);
        throw new Error("Erro de infraestrutura ao apagar no banco de dados.");
    }
}

/**
 * Exclui várias transações garantindo que pertencem ao usuário ativo.
 */
export async function excluirMultiplasTransacoesDb(ids: string[], userId: string) {
    try {
        return await prisma.transaction.deleteMany({
            where: {
                id: { in: ids },
                userId: userId
            }
        });
    } catch (error) {
        console.error("[DADOS] Falha ao excluir Transactions em lote:", error);
        throw new Error("Erro de infraestrutura ao apagar lote.");
    }
}
//#endregion

//#region AUXILIARES
/**
 * Busca o tipo de transação (Receita/Gasto/etc) para a lógica matemática de atualização.
 */
export async function buscarTipoTransacaoDb(typeId: string) {
    return prisma.transactionType.findUnique({where: {id: typeId}});
}
//#endregion