// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/dados/prisma";
import { identifyCategory } from "@/utilitarios/categorizer";
import { processarNovaTransacao } from "@/negocios/transacaoNegocios";

/**
 * Endpoint chamado pelo formulário (View) para registrar uma transação.
 * * @param formData - Os dados embutidos do formulário HTML.
 * @returns Retorna a mensagem de erro para a tela, ou atualiza a página em caso de sucesso.
 */
export async function addTransaction(formData: FormData) {
    // 1. Extrair os dados da View (Formulário)
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

    // 2. Passar a responsabilidade para a Camada de Negócios
    const resultado = await processarNovaTransacao(dadosFormulario);

    // 3. Devolver a resposta para a View
    if (resultado.erro) {
        return { error: resultado.erro }; // O modal na tela vai mostrar este texto
    }

    // 4. Sucesso! Pede para o Next.js recarregar a tela para atualizar o saldo
    revalidatePath("/");
    revalidatePath("/gastos");

    return { success: true };
}

export async function deleteTransaction(id: string) {
    await prisma.transaction.delete({
        where: { id },
    });

    revalidatePath("/");
    revalidatePath("/gastos");
}

export async function updateTransaction(id: string, formData: FormData) {
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
}

export async function upsertBudget(categoryId: string, amount: number) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Selecione um perfil (Arthur ou Flávia) no menu antes de definir um orçamento." };
    }

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
}

// (O importTransactions original de CSV foi mantido, mas não alterado já que não estamos usando)
export async function importTransactions(transactions: any[]) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Por favor, selecione um perfil (Arthur ou Flávia) no menu lateral antes de importar o extrato." };
    }

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

        const category = allCategories.find(
            c => c.name.toLowerCase() === suggestedCategoryName.toLowerCase()
        );

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

    try {
        await prisma.transaction.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });
    } catch (error) {
        console.error("Erro no Prisma:", error);
        return { error: "Erro ao salvar no banco. Verifique se os dados estão corretos." };
    }

    revalidatePath("/");
    revalidatePath("/gastos");
    return { success: true };
}

export async function updateTransactionCategory(transactionId: string, categoryId: string) {
    await prisma.transaction.update({
        where: { id: transactionId },
        data: { categoryId }
    });
    revalidatePath("/gastos");
    revalidatePath("/");
}

export async function setActiveProfile(userId: string) {
    if (userId === "casal") {
        (await cookies()).delete("activeProfileId");
    } else {
        (await cookies()).set("activeProfileId", userId, { path: "/" });
    }
}

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
        console.error("Erro ao apagar transações em massa:", error);
        return { error: "Erro ao apagar as transações selecionadas." };
    }
}

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
        return { error: "Erro ao apagar a meta." };
    }
}

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
        return { error: "Erro ao cadastrar o cartão." };
    }
}

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
        return { error: "Não foi possível apagar. Verifique se existem transações vinculadas a este cartão." };
    }
}

// ==========================================
// NOVAS FUNÇÕES: CAIXINHAS / OBJETIVOS (GOALS)
// ==========================================

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
        return { error: "Erro ao criar a caixinha." };
    }
}

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
                    increment: amountToAdd // O Prisma soma o valor automaticamente!
                }
            }
        });
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        return { error: "Erro ao adicionar dinheiro na caixinha." };
    }
}

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
        return { error: "Erro ao apagar a caixinha." };
    }
}

export async function importReviewedTransactions(transactions: any[]) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Por favor, selecione um perfil antes de importar o extrato." };
    }

    const types = await prisma.transactionType.findMany();
    const gastoType = types.find(t => t.name === "Gasto");
    const receitaType = types.find(t => t.name === "Receita");
    const investimentoType = types.find(t => t.name.toUpperCase() === "INVESTIMENTO");
    // Novo tipo de transferência
    const transferenciaType = types.find(t => t.name.toUpperCase() === "TRANSFERÊNCIA" || t.name.toUpperCase() === "TRANSFERENCIA");

    if (!gastoType || !receitaType) {
        return { error: "Tipos de transação não encontrados. Corra o SEED." };
    }

    const dataToSave = transactions.map(t => {
        const isNegative = t.value < 0;

        let finalTypeId = isNegative ? gastoType.id : receitaType.id;

        // Verifica as sobrescritas do OFX
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
            bankAccountId: t.bankAccountId || null, // Guarda a conta bancária
        };
    });

    try {
        await prisma.transaction.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });
        // Atualiza a interface
        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("Erro no Prisma:", error);
        return { error: "Erro ao salvar na base de dados. Verifique os dados." };
    }
}