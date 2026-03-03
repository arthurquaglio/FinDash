// src/lib/categorizer.ts

export const categoryMap: Record<string, string[]> = {
    "Alimentação": ["MERCADO", "IFOOD", "RESTAURANTE", "PADARIA", "AÇOUGUE", "DINAMICO", "PIX QR CODE"],
    "Moradia": ["ALUGUEL", "CONDOMINIO", "CPFL", "ENEL", "SABESP", "VIVO", "CLARO", "INTERNET"],
    "Salário": ["PAGAMENTOS DIVERSOS DRH", "SALARIO", "PROVENTOS"],
    "Renda Fixa": ["FACILCRED", "RENTAB", "INVEST", "TESOURO", "CDB"],
    "Lazer": ["NETFLIX", "SPOTIFY", "CINEMA", "STEAM", "BAR", "CERVEJARIA", "COFFEE", "VISA ELECTRON"],
    "Educação": ["FACULDADE", "CURSO", "SCHOOL", "UDEMY", "ALURA", "LIVRARIA", "ESCOLA"],
    "Academia": ["SMARTFIT", "BLUEFIT", "GYMPASS", "ACADEMIA", "FITNESS", "CROSSFIT"],
    "Transporte": ["UBER", "99APP", "POSTO", "COMBUSTIVEL", "SHELL", "IPIRANGA", "PEDAGIO"],
};

export function identifyCategory(description: string): string {
    const desc = description.toUpperCase();

    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
            return category;
        }
    }

    return "Lazer";
}