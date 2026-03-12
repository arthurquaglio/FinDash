// src/lib/categorizer.ts
// noinspection SpellCheckingInspection

export const categoryMap: Record<string, string[]> = {
    "Transporte": [
        "uber",
        "99app",
        "posto",
        "concessionaria"
    ],
    "Alimentação": [
        "ifood",
        "rappi",
        "padaria",
        "restaurante",
        "lanchonete"
    ],
    "Supermercado": [
        "supermercado",
        "atacadao",
        "carrefour",
        "pao de acucar",
        "assai"
    ],
    "Saúde": [
        "farmacia",
        "drogaria",
        "droga raia",
        "pague menos",
        "unimed"
    ],
    "Lazer": [
        "netflix",
        "spotify",
        "cinema",
        "prime video"
    ],
    "Moradia": [
        "enel",
        "sabesp",
        "condominio",
        "aluguel"
    ],
    "Salário": [
        "pagamentos diversos drh",
        "salario",
        "adiantamento"
    ],
    "Investimentos": [
        "rentab.invest",
        "criptoativos",
        "rendimento",
        "cdb"
    ]
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