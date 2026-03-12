// src/view/bank-icon.tsx
import React from 'react';
import { Building2, Wallet } from 'lucide-react';

//#region INTERFACES
/**
 * Propriedades esperadas pelo componente BankIcon.
 * * @property {string} bankName - O nome da instituição financeira (ex: "Nubank", "Bradesco").
 * * @property {string} [className] - Classes opcionais do Tailwind para formatar tamanho/cor por fora.
 */
interface BankIconProps {
    bankName: string;
    className?: string;
}
//#endregion

//#region COMPONENTE VISUAL
/**
 * Renderiza um ícone ou logo customizado baseado no nome da conta bancária.
 * Caso o banco não esteja mapeado, retorna um ícone de prédio genérico.
 * * * @param props - As propriedades do componente (BankIconProps).
 * @returns Um elemento JSX contendo o ícone formatado.
 */
export function BankIcon({ bankName, className = "w-6 h-6" }: BankIconProps) {
    const name = bankName.toLowerCase();

    //#region LÓGICA DE MAPEAMENTO DE CORES E LOGOS
    if (name.includes('inter')) return <div className={`flex items-center justify-center rounded-md bg-orange-500 font-bold text-white ${className}`}>in</div>;
    if (name.includes('nubank') || name.includes('nu')) return <div className={`flex items-center justify-center rounded-md bg-purple-600 font-bold text-white ${className}`}>nu</div>;
    if (name.includes('bradesco')) return <div className={`flex items-center justify-center rounded-md bg-red-600 font-bold text-white ${className}`}>Br</div>;
    if (name.includes('itau') || name.includes('itaú')) return <div className={`flex items-center justify-center rounded-md bg-orange-500 font-bold text-blue-900 ${className}`}>it</div>;
    if (name.includes('caixa')) return <div className={`flex items-center justify-center rounded-md bg-blue-600 font-bold text-white ${className}`}>X</div>;
    if (name.includes('santander')) return <div className={`flex items-center justify-center rounded-md bg-red-500 font-bold text-white ${className}`}>S</div>;
    if (name.includes('dinheiro') || name.includes('carteira')) return <Wallet className={`text-emerald-500 ${className}`} />;
    //#endregion

    // Fallback: Ícone Padrão se não encontrar correspondência
    return <Building2 className={`text-zinc-400 ${className}`} />;
}
//#endregion