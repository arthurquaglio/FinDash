// src/negocios/contaBancariaNegocios.ts
import { criarContaBancariaDb } from "@/dados/contaBancariaDados";

//#region CONTA BANCÁRIA BLL
/**
 * Aplica as regras de negócio para a criação de uma nova conta bancária.
 * @param dadosBrutos - Os dados crus vindos do formulário.
 * @returns Objeto indicando sucesso ou a mensagem de erro formatada.
 */
export async function processarNovaContaBancaria(dadosBrutos: any) {
    try {
        // 1. Validações
        if (!dadosBrutos.name || dadosBrutos.name.trim() === "") {
            return { erro: "O nome do banco é obrigatório (ex: Nubank, Inter)." };
        }
        if (!dadosBrutos.userId) {
            return { erro: "Erro de segurança: Perfil não identificado." };
        }

        // 2. DTO
        const contaMapeada = {
            name: dadosBrutos.name.trim(),
            initialValue: Number(dadosBrutos.initialValue) || 0,
            userId: dadosBrutos.userId
        };

        // 3. Persistência
        await criarContaBancariaDb(contaMapeada);

        return { sucesso: true };
    } catch (error: any) {
        console.error("[NEGÓCIOS] Violação ao criar conta:", error.message);
        return { erro: "Não foi possível criar a conta bancária neste momento." };
    }
}
//#endregion