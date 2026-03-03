// src/app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
        },
    });

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
        where: { categoryId },
        update: { amount },
        create: {
            categoryId,
            amount,
        },
    });

    revalidatePath("/");
}