// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { identifyCategory } from "@/lib/categorizer";

export async function addTransaction(formData: FormData) {
    // 1. Descobrir quem está adicionando o gasto
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    // Se estiver na "Visão do Casal", retorna o erro em vez de quebrar o servidor
    if (!activeProfileId) {
        return { error: "Selecione um perfil (Arthur ou Flávia) no menu antes de adicionar." };
    }

    // 2. Extrai os dados que o formulário enviou
    const name = formData.get("name") as string;
    const rawValue = Number(formData.get("value"));
    const dateString = formData.get("date") as string;
    const typeId = formData.get("typeId") as string;
    const categoryId = formData.get("categoryId") as string;

    // 3. Busca o Tipo no banco para aplicar a regra de negócio do sinal matemático (+ ou -)
    const type = await prisma.transactionType.findUnique({
        where: { id: typeId }
    });

    const value = type?.name === "Receita" ? Math.abs(rawValue) : -Math.abs(rawValue);

    // 4. Salva a transação real no PostgreSQL usando o ID verdadeiro!
    await prisma.transaction.create({
        data: {
            name,
            value,
            date: new Date(`${dateString}T12:00:00Z`),
            typeId,
            categoryId,
            userId: activeProfileId
        }
    });

    // 5. Diz ao Next.js para recarregar os dados
    revalidatePath("/");
    revalidatePath("/gastos");

    // 6. Retorna sucesso para o formulário saber que pode fechar
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
    // 1. Descobre quem está logado
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        return { error: "Selecione um perfil (Arthur ou Flávia) no menu antes de apagar." };
    }

    try {
        // 2. Apaga todas as transações que estão na lista de IDs e que pertencem ao usuário atual
        await prisma.transaction.deleteMany({
            where: {
                id: { in: ids },
                userId: activeProfileId // Trava de segurança importantíssima!
            }
        });

        // 3. Atualiza as telas
        revalidatePath("/");
        revalidatePath("/gastos");

        return { success: true };
    } catch (error) {
        console.error("Erro ao apagar transações em massa:", error);
        return { error: "Erro ao apagar as transações selecionadas." };
    }
}