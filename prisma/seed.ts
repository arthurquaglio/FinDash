// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando o seed de dados...');

    // 1. Criar os Tipos Fixos (usamos upsert para não duplicar se rodar 2x)
    const gasto = await prisma.transactionType.upsert({
        where: { name: 'Gasto' }, update: {}, create: { name: 'Gasto' },
    });
    const receita = await prisma.transactionType.upsert({
        where: { name: 'Receita' }, update: {}, create: { name: 'Receita' },
    });
    const investimento = await prisma.transactionType.upsert({
        where: { name: 'Investimento' }, update: {}, create: { name: 'Investimento' },
    });

    // 2. Criar as Categorias Padrão
    const categorias = [
        { name: 'Alimentação', color: '#10b981', icon: 'shopping-cart' },
        { name: 'Moradia', color: '#3b82f6', icon: 'home' },
        { name: 'Salário', color: '#8b5cf6', icon: 'briefcase' },
        { name: 'Renda Fixa', color: '#f59e0b', icon: 'trending-up' },
        { name: 'Lazer', color: '#ec4899', icon: 'coffee' }
    ];

    for (const cat of categorias) {
        // Busca se já existe para evitar erro de duplicidade
        const existe = await prisma.category.findFirst({ where: { name: cat.name } });
        if (!existe) {
            await prisma.category.create({ data: cat });
        }
    }

    console.log('Seed finalizado com sucesso!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });