// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/dados/prisma";
import { identifyCategory } from "@/utilitarios/categorizer";
import { processarNovaTransacao } from "@/negocios/transacaoNegocios";

//#region PERFIL & AUTENTICAÇÃO
/**
 * Define qual perfil (Arthur ou Flávia) está ativo no momento usando Cookies.
 * * @param userId - O ID do usuário ativo, ou "casal" para limpar a seleção.
 * @returns Promessa vazia (void).
 */
export async function setActiveProfile(userId: string) {
    if (userId === "casal") {
        (await cookies()).delete("activeProfileId");
    } else {
        (await cookies()).set("activeProfileId", userId, { path: "/" });
    }
}
//#endregion

//#region TRANSAÇÕES (CRUD PADRÃO)
/**
 * Endpoint chamado pelo formulário (View) para registrar uma transação.
 * Esta função utiliza a camada de Negócios (BLL) para validação.
 * * @param formData - Os dados embutidos do formulário HTML.
 * @returns Retorna a mensagem de erro para a tela, ou atualiza a página em caso de sucesso.
 */
export async function addTransaction(formData: FormData) {
    const dadosFormulario = {
        name: formData.get("name")?.toString() || "",
        value: parseFloat(formData.get("value")?.toString() || "0"),
        date: formData.get("date")?.toString() || new Date().toISOString(),
        categoryId: formData.get("categoryId")?.toString() || "",
        typeId: formData.get("typeId")?.toString() || "",
        userId: formData.get("userId")?.toString() || "",
        bankAccountId: formData.get("bankAccountId")?.toString() || "",
        creditCardId: formData.get("creditCardId")?.toString() || "",
    };

    const resultado = await processarNovaTransacao(dadosFormulario);

    if (resultado.erro) {
        return { error: resultado.erro };
    }

    revalidatePath("/");
    revalidatePath("/gastos");
    return { success: true };
}

/**
 * Atualiza os dados de uma transação existente.
 * * @param id - O ID único da transação a ser editada.
 * @param id
 * @param formData - Os dados do formulário com as novas informações.
 * @returns Objeto indicando sucesso ou erro da operação.
 */
export async function updateTransaction(id: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const rawValue = Number(formData.get("value"));
        const typeId = formData.get("typeId") as string;
        const categoryId = formData.get("categoryId") as string;
        const dateString = formData.get("date") as string;
        const bankAccountId = formData.get("bankAccountId") as string | null;

        const type = await prisma.transactionType.findUnique({ where: { id: typeId } });
        const value = type?.name === "Receita" ? Math.abs(rawValue) : -Math.abs(rawValue);

        await prisma.transaction.update({
            where: { id },
            data: {
                name,
                value,
                date: new Date(`${dateString}T12:00:00Z`),
                typeId,
                categoryId,
                ...(bankAccountId !== undefined && { bankAccountId: bankAccountId === "" ? null : bankAccountId })
            },
        });

        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao atualizar transação:", error);
        return { error: "Erro ao atualizar a transação." };
    }
}

/**
 * Atualiza rapidamente apenas a categoria de uma transação (usado na listagem rápida).
 * * @param transactionId - O ID da transação.
 * @param transactionId
 * @param categoryId - O ID da nova categoria selecionada.
 * @returns Objeto indicando sucesso ou erro.
 */
export async function updateTransactionCategory(transactionId: string, categoryId: string) {
    try {
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { categoryId }
        });
        revalidatePath("/gastos");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { error: "Erro ao atualizar categoria." };
    }
}

/**
 * Exclui uma única transação do banco de dados.
 * * @param id - O ID da transação a ser apagada.
 * @returns Objeto indicando sucesso ou erro.
 */
export async function deleteTransaction(id: string) {
    try {
        await prisma.transaction.delete({
            where: { id },
        });

        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao apagar transação:", error);
        return { error: "Não foi possível apagar a transação." };
    }
}

/**
 * Exclui múltiplas transações simultaneamente (ação em lote).
 * Valida a autoria através do perfil ativo no Cookie.
 * * @param ids - Um array de strings com os IDs das transações a serem apagadas.
 * @returns Objeto indicando sucesso ou erro.
 */
export async function deleteManyTransactions(ids: string[]) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Selecione um perfil (Arthur ou Flávia) no menu antes de apagar." };
    }

    try {
        await prisma.transaction.deleteMany({
            where: {
                id: { in: ids },
                userId: activeProfileId
            }
        });

        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao apagar transações em massa:", error);
        return { error: "Erro ao apagar as transações selecionadas." };
    }
}
//#endregion

//#region IMPORTAÇÕES (OFX E CSV)
/**
 * Importa transações de um arquivo OFX validado pelo usuário.
 * * @param transactions - Um array de objetos de transação já passados pelas regras de negócio e revisão do usuário.
 * @returns Objeto indicando sucesso ou a mensagem de erro.
 */
export async function importReviewedTransactions(transactions: any[]) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Por favor, selecione um perfil antes de importar o extrato." };
    }

    try {
        const types = await prisma.transactionType.findMany();
        const gastoType = types.find(t => t.name === "Gasto");
        const receitaType = types.find(t => t.name === "Receita");
        const investimentoType = types.find(t => t.name.toUpperCase() === "INVESTIMENTO");
        const transferenciaType = types.find(t => t.name.toUpperCase() === "TRANSFERÊNCIA" || t.name.toUpperCase() === "TRANSFERENCIA");

        if (!gastoType || !receitaType) {
            return { error: "Tipos de transação não encontrados. Corra o SEED." };
        }

        const dataToSave = transactions.map(t => {
            const isNegative = t.value < 0;
            let finalTypeId = isNegative ? gastoType.id : receitaType.id;

            if (t.overrideType === "Investimento" && investimentoType) {
                finalTypeId = investimentoType.id;
            } else if (t.overrideType === "Receita") {
                finalTypeId = receitaType.id;
            } else if (t.overrideType === "Transferência" && transferenciaType) {
                finalTypeId = transferenciaType.id;
            }

            return {
                name: t.name,
                value: t.value,
                date: new Date(t.date),
                categoryId: t.categoryId,
                typeId: finalTypeId,
                userId: activeProfileId,
                creditCardId: t.creditCardId || null,
                bankAccountId: t.bankAccountId || null,
            };
        });

        await prisma.transaction.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });

        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro no Prisma ao importar OFX:", error);
        return { error: "Erro ao salvar na base de dados. Verifique os dados." };
    }
}

/**
 * [LEGADO] Importa transações a partir de um arquivo CSV bruto (Sem revisão prévia).
 * * @param transactions - Array de objetos parseados do CSV.
 * @returns Objeto indicando sucesso ou erro.
 */
export async function importTransactions(transactions: any[]) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Por favor, selecione um perfil (Arthur ou Flávia) no menu lateral antes de importar o extrato." };
    }

    try {
        const types = await prisma.transactionType.findMany();
        const allCategories = await prisma.category.findMany();

        const defaultCategory = allCategories[0];
        const gastoType = types.find(t => t.name === "Gasto");
        const receitaType = types.find(t => t.name === "Receita");

        if (!defaultCategory || !gastoType || !receitaType) {
            return { error: "Certifique-se de rodar o SEED antes de importar." };
        }

        const dataToSave = transactions.map(t => {
            const suggestedCategoryName = identifyCategory(t.name);
            const category = allCategories.find(c => c.name.toLowerCase() === suggestedCategoryName.toLowerCase());
            const isNegative = t.value < 0;

            return {
                name: t.name,
                value: t.value,
                date: t.date,
                categoryId: category ? category.id : defaultCategory.id,
                typeId: isNegative ? gastoType.id : receitaType.id,
                userId: activeProfileId,
            };
        });

        await prisma.transaction.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });

        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro no Prisma ao importar CSV:", error);
        return { error: "Erro ao salvar no banco. Verifique se os dados estão corretos." };
    }
}
//#endregion

//#region ORÇAMENTOS (BUDGETS)
/**
 * Cria ou atualiza o limite de gastos (Orçamento) de uma categoria para o perfil ativo.
 * * @param categoryId - O ID da categoria a ser orçada.
 * @param categoryId
 * @param amount - O valor máximo definido para o orçamento.
 * @returns Objeto com sucesso ou mensagem de erro se o perfil não estiver ativo.
 */
export async function upsertBudget(categoryId: string, amount: number) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Selecione um perfil (Arthur ou Flávia) no menu antes de definir um orçamento." };
    }

    try {
        await prisma.budget.upsert({
            where: {
                categoryId_userId: {
                    categoryId: categoryId,
                    userId: activeProfileId
                }
            },
            update: { amount },
            create: {
                categoryId,
                amount,
                userId: activeProfileId,
            },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao salvar Budget:", error);
        return { error: "Não foi possível gravar o orçamento." };
    }
}

/**
 * Apaga um orçamento existente de uma categoria.
 * * @param categoryId - O ID da categoria cujo orçamento será apagado.
 * @returns Objeto com sucesso ou mensagem de erro.
 */
export async function deleteBudget(categoryId: string) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) return { error: "Selecione um perfil." };

    try {
        await prisma.budget.delete({
            where: {
                categoryId_userId: {
                    categoryId: categoryId,
                    userId: activeProfileId
                }
            }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao deletar Budget:", error);
        return { error: "Erro ao apagar a meta." };
    }
}
//#endregion

//#region CARTÕES DE CRÉDITO
/**
 * Registra um novo cartão de crédito associado ao perfil ativo.
 * * @param formData - Dados do formulário contendo nome, dia de fechamento e dia de vencimento.
 * @returns Objeto indicando sucesso ou erro no registro.
 */
export async function addCreditCard(formData: FormData) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) return { error: "Selecione um perfil." };

    const name = formData.get("name") as string;
    const closingDay = Number(formData.get("closingDay"));
    const dueDay = Number(formData.get("dueDay"));

    try {
        await prisma.creditCard.create({
            data: {
                name,
                closingDay,
                dueDay,
                userId: activeProfileId
            }
        });
        revalidatePath("/cartoes");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao criar Cartão:", error);
        return { error: "Erro ao cadastrar o cartão." };
    }
}

/**
 * Exclui um cartão de crédito.
 * * @param id - O ID único do cartão de crédito.
 * @returns Retorna sucesso ou erro caso existam transações vinculadas.
 */
export async function deleteCreditCard(id: string) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) return { error: "Selecione um perfil." };

    try {
        await prisma.creditCard.delete({
            where: {
                id: id,
                userId: activeProfileId
            }
        });
        revalidatePath("/cartoes");
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao apagar Cartão:", error);
        return { error: "Não foi possível apagar. Verifique se existem transações vinculadas a este cartão." };
    }
}
//#endregion

//#region CAIXINHAS (GOALS / OBJETIVOS)
/**
 * Cria uma nova "Caixinha" (meta financeira) para o perfil ativo.
 * * @param formData - Dados do formulário contendo nome, valor alvo e saldo atual.
 * @returns Objeto indicando sucesso ou erro na criação.
 */
export async function addGoal(formData: FormData) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) return { error: "Selecione um perfil." };

    const name = formData.get("name") as string;
    const targetAmount = Number(formData.get("targetAmount"));
    const currentAmount = Number(formData.get("currentAmount")) || 0;

    try {
        await prisma.goal.create({
            data: {
                name,
                targetAmount,
                currentAmount,
                userId: activeProfileId
            }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao criar Caixinha:", error);
        return { error: "Erro ao criar a caixinha." };
    }
}

/**
 * Adiciona (incrementa) fundos a uma Caixinha existente.
 * * @param goalId - O ID da Caixinha (meta).
 * @param goalId
 * @param amountToAdd - O valor a ser adicionado ao montante atual.
 * @returns Objeto indicando sucesso ou erro na atualização.
 */
export async function addMoneyToGoal(goalId: string, amountToAdd: number) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) return { error: "Selecione um perfil." };

    try {
        await prisma.goal.update({
            where: {
                id: goalId,
                userId: activeProfileId // Segurança extra
            },
            data: {
                currentAmount: {
                    increment: amountToAdd
                }
            }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao injetar dinheiro na Caixinha:", error);
        return { error: "Erro ao adicionar dinheiro na caixinha." };
    }
}

/**
 * Apaga definitivamente uma Caixinha (meta financeira).
 * * @param id - O ID da caixinha a ser deletada.
 * @returns Objeto indicando sucesso ou erro.
 */
export async function deleteGoal(id: string) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) return { error: "Selecione um perfil." };

    try {
        await prisma.goal.delete({
            where: {
                id: id,
                userId: activeProfileId
            }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("[ACTIONS] Erro ao apagar Caixinha:", error);
        return { error: "Erro ao apagar a caixinha." };
    }
}
//#endregion