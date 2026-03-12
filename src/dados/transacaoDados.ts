// src/dados/transacaoDados.ts
import { prisma } from "@/dados/prisma"; // Ajuste o caminho se o seu ficheiro prisma.ts tiver outro nome

/**
 * Insere fisicamente uma nova transação no banco de dados.
 * * @param dados - Objeto contendo as propriedades da transação a ser salva.
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