// src/dados/contaBancariaDados.ts
import { prisma } from "@/dados/prisma";

//#region CONTA BANCÁRIA DAL
/**
 * Insere fisicamente uma nova conta bancária no banco de dados.
 * @param dados - DTO contendo o nome, saldo inicial e o ID do usuário.
 * @returns Retorna a entidade BankAccount recém-criada.
 * @throws Lança erro em caso de falha na conexão.
 */
export async function criarContaBancariaDb(dados: any) {
    try {
        return await prisma.bankAccount.create({ data: dados });
    } catch (error) {
        console.error("[DADOS] Erro ao criar conta bancária no Prisma:", error);
        throw new Error("Erro de infraestrutura ao salvar a conta bancária.");
    }
}
//#endregion