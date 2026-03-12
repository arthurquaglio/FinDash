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
        data: { name: 'Flávia' },
    })

    // 2. Criar os Tipos de Transação (AGORA COM TRANSFERÊNCIA)
    await prisma.transactionType.createMany({
        data: [
            { name: 'Gasto' },
            { name: 'Receita' },
            { name: 'Investimento' },
            { name: 'Transferência' } // <-- NOVO TIPO AQUI
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

    // 4. NOVO: Criar as Contas Bancárias Iniciais
    await prisma.bankAccount.createMany({
        data: [
            { name: 'Bradesco', userId: arthur.id },
            { name: 'Banco Inter', userId: arthur.id },
            { name: 'Conta Principal', userId: flavia.id }
        ],
        skipDuplicates: true,
    })

    console.log('Seed executado com sucesso! Usuários, Categorias e Contas Bancárias criados.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })