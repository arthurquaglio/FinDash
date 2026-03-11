// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { identifyCategory } from "@/lib/categorizer";

export async function addTransaction(formData: FormData) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Selecione um perfil (Arthur ou Flávia) no menu antes de adicionar." };
    }

    const name = formData.get("name") as string;
    const rawValue = Number(formData.get("value"));
    const dateString = formData.get("date") as string;
    const typeId = formData.get("typeId") as string;
    const categoryId = formData.get("categoryId") as string;

    const creditCardId = formData.get("creditCardId") as string | null;

    const installments = Number(formData.get("installments")) || 1;
    const fixedMonths = Number(formData.get("fixedMonths")) || 1;

    const type = await prisma.transactionType.findUnique({
        where: { id: typeId }
    });

    const totalValue = type?.name === "Receita" ? Math.abs(rawValue) : -Math.abs(rawValue);

    const iterations = Math.max(installments, fixedMonths);

    const iterationValue = installments > 1
        ? Math.round((totalValue / installments) * 100) / 100
        : totalValue;

    const transactionsToCreate = [];
    const baseDate = new Date(`${dateString}T12:00:00Z`);

    for (let i = 1; i <= iterations; i++) {
        const iterationDate = new Date(baseDate);
        iterationDate.setMonth(baseDate.getMonth() + (i - 1));

        let finalName = name;
        if (installments > 1) {
            finalName = `${name} (${i}/${iterations})`;
        }

        transactionsToCreate.push({
            name: finalName,
            value: iterationValue,
            date: iterationDate,
            typeId,
            categoryId,
            userId: activeProfileId,
            creditCardId: creditCardId === "" ? null : creditCardId
        });
    }

    await prisma.transaction.createMany({
        data: transactionsToCreate
    });

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

    if (!gastoType || !receitaType) {
        return { error: "Tipos de transação não encontrados. Rode o SEED." };
    }

    const dataToSave = transactions.map(t => {
        const isNegative = t.value < 0;
        return {
            name: t.name,
            value: t.value,
            // Certificando que a data vai no formato correto
            date: new Date(t.date),
            categoryId: t.categoryId,
            typeId: isNegative ? gastoType.id : receitaType.id,
            userId: activeProfileId,
            creditCardId: t.creditCardId || null,
        };
    });

    try {
        await prisma.transaction.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });
        revalidatePath("/");
        revalidatePath("/gastos");
        return { success: true };
    } catch (error) {
        console.error("Erro no Prisma:", error);
        return { error: "Erro ao salvar no banco. Verifique os dados." };
    }
}