// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers"; // Importação movida para o topo!
import { prisma } from "@/lib/prisma";
import { identifyCategory } from "@/lib/categorizer";

export async function addTransaction(formData: FormData) {
    // 1. Descobrir quem está adicionando o gasto
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    // Se estiver na "Visão do Casal", trava a criação e avisa o usuário
    if (!activeProfileId) {
        throw new Error("Selecione um perfil (Arthur ou Flávia) no menu antes de adicionar.");
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
            userId: activeProfileId // <-- CORRIGIDO AQUI!
        }
    });

    // 5. Diz ao Next.js para recarregar os dados
    revalidatePath("/");
    revalidatePath("/gastos");
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
    // Mesma trava de segurança: precisa saber de quem é o orçamento
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        throw new Error("Selecione um perfil (Arthur ou Flávia) no menu antes de definir um orçamento.");
    }

    await prisma.budget.upsert({
        where: {
            categoryId_userId: {
                categoryId: categoryId,
                userId: activeProfileId // <-- CORRIGIDO AQUI!
            }
        },
        update: { amount },
        create: {
            categoryId,
            amount,
            userId: activeProfileId, // <-- CORRIGIDO AQUI!
        },
    });

    revalidatePath("/");
}

export async function importTransactions(transactions: any[]) {
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    if (!activeProfileId) {
        throw new Error("Por favor, selecione um perfil (Arthur ou Flávia) no menu lateral antes de importar o extrato.");
    }

    const types = await prisma.transactionType.findMany();
    const allCategories = await prisma.category.findMany();

    const defaultCategory = allCategories[0];
    const gastoType = types.find(t => t.name === "Gasto");
    const receitaType = types.find(t => t.name === "Receita");

    if (!defaultCategory || !gastoType || !receitaType) {
        throw new Error("Certifique-se de rodar o SEED antes de importar.");
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
        throw new Error("Erro ao salvar no banco. Verifique se os dados estão corretos.");
    }

    revalidatePath("/");
    revalidatePath("/gastos");
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