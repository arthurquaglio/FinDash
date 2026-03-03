import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // 1. Criar os Usuários
    // @ts-ignore
    const arthur = await prisma.user.create({
        data: { name: 'Arthur' },
    })

    // @ts-ignore
    const flavia = await prisma.user.create({
        data: { name: 'Flávia' }, // Troque pelo nome dela!
    })

    // 2. Criar os Tipos de Transação (se já não existirem no seu seed)
    await prisma.transactionType.createMany({
        data: [
            { name: 'Gasto' },
            { name: 'Receita' },
            { name: 'Investimento' }
        ],
        skipDuplicates: true,
    })

    // 3. Criar as Categorias (sua lista atualizada)
    const categorias = [
        { name: 'Alimentação' },
        { name: 'Moradia' },
        { name: 'Salário' },
        { name: 'Renda Fixa' },
        { name: 'Lazer' },
        { name: 'Educação' },
        { name: 'Academia' },
        { name: 'Saúde' },
        { name: 'Transporte' },
        { name: 'Outros' }
    ]

    await prisma.category.createMany({
        data: categorias,
        skipDuplicates: true,
    })

    console.log('Seed executado com sucesso! Usuários e Categorias criados.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })