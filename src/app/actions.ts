// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {identifyCategory} from "@/lib/categorizer";

export async function addTransaction(formData: FormData) {
    // 1. Extrai os dados que o formulário enviou
    const name = formData.get("name") as string;
    const rawValue = Number(formData.get("value"));
    const dateString = formData.get("date") as string;
    const typeId = formData.get("typeId") as string;
    const categoryId = formData.get("categoryId") as string;

    // 2. Busca o Tipo no banco para aplicar a regra de negócio do sinal matemático (+ ou -)
    const type = await prisma.transactionType.findUnique({
        where: { id: typeId }
    });

    const value = type?.name === "Receita" ? Math.abs(rawValue) : -Math.abs(rawValue);

    // 3. Salva a transação real no PostgreSQL
    await prisma.transaction.create({
        data: {
            name,
            value,
            date: new Date(`${dateString}T12:00:00Z`), // Força o horário do meio-dia para evitar bugs de fuso horário
            typeId,
            categoryId,
            userId: "usuario-casal-unico" // <-- Adicione isso! (pode ser qualquer string)
        }
    })

    // 4. Diz ao Next.js para recarregar os dados da página inicial
    revalidatePath("/");
}

export async function deleteTransaction(id: string) {
    await prisma.transaction.delete({
        where: { id },
    });

    // Revalida as duas rotas para atualizar os dados na tela
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

// Adicione ao seu src/app/actions.ts

export async function upsertBudget(categoryId: string, amount: number) {
    await prisma.budget.upsert({
        where: {
            // Em vez de passar só o categoryId, passamos a combinação que o Prisma exige:
            categoryId_userId: {
                categoryId: categoryId,
                userId: "usuario-casal-unico" // O mesmo ID que você usou na Transaction
            }
        },
        update: { amount },
        create: {
            categoryId,
            amount,
            userId: "usuario-casal-unico", // Não esqueça de colocar no create também!
        },
    });

    revalidatePath("/");
}

export async function importTransactions(transactions: any[]) {
    // 1. Descobrir quem está importando
    const cookieStore = await cookies();
    const activeProfileId = cookieStore.get("activeProfileId")?.value;

    // Se estiver na "Visão do Casal" (sem ID definido), bloqueia a importação
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

    // 2. Prepara os dados incluindo o DONO da transação (userId)
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
            userId: activeProfileId, // <-- O SEGREDO ESTÁ AQUI!
        };
    });

    // 3. Tenta inserir no banco
    try {
        await prisma.transaction.createMany({
            data: dataToSave,
            skipDuplicates: true,
        });
    } catch (error) {
        console.error("Erro no Prisma:", error);
        throw new Error("Erro ao salvar no banco. Verifique se os dados estão corretos.");
    }

    // 4. Atualiza as telas
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

import { cookies } from "next/headers";

export async function setActiveProfile(userId: string) {
    if (userId === "casal") {
        // Se escolheu "Casal", apagamos o cookie para ver tudo
        (await cookies()).delete("activeProfileId");
    } else {
        // Se escolheu Arthur ou Flávia, salvamos o ID deles
        (await cookies()).set("activeProfileId", userId, { path: "/" });
    }
}