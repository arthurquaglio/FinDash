// src/components/import-ofx.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importReviewedTransactions } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { identifyCategory } from "@/lib/categorizer";

interface ImportOFXProps {
    categories: any[];
    creditCards: any[];
    bankAccounts: any[];
}

type ParsedTransaction = {
    id: string;
    date: Date;
    name: string;
    value: number;
    categoryId: string;
    creditCardId: string | null;
    bankAccountId: string | null;
    selected: boolean;
    overrideType?: "Investimento" | "Receita" | "Transferência" | null;
};

export function ImportOFX({ categories, creditCards, bankAccounts }: ImportOFXProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>("");

    useEffect(() => {
        if (bankAccounts && bankAccounts.length > 0 && !selectedBankAccountId) {
            setSelectedBankAccountId(bankAccounts[0].id);
        }
    }, [bankAccounts, selectedBankAccountId]);

    // Motor de leitura OFX
    const processarOFX = (textoOFX: string) => {
        const transacoes: ParsedTransaction[] = [];
        const regexBloco = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;

        const extrairValor = (tag: string, texto: string) => {
            const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`);
            const match = texto.match(regex);
            return match ? match[1].trim() : null;
        };

        const defaultCategory = categories[0];

        let match;
        while ((match = regexBloco.exec(textoOFX)) !== null) {
            const bloco = match[1];

            const dataPostagem = extrairValor('DTPOSTED', bloco);
            const valorStr = extrairValor('TRNAMT', bloco);
            let descricao = (extrairValor('MEMO', bloco) || extrairValor('NAME', bloco) || "TRANSAÇÃO DESCONHECIDA").toUpperCase();
            const idTransacao = extrairValor('FITID', bloco) || `temp-${Math.random()}`;

            if (!dataPostagem || !valorStr) continue;

            // ==========================================
            // EXCLUSÃO DE TRANSAÇÕES IGNORADAS
            // ==========================================
            if (
                descricao.includes("RESG.AUTOM.INVEST") ||
                descricao.includes("RESGATE INVEST") ||
                descricao.includes("APL.INVEST FAC") ||
                descricao.includes("RESGATE INV FAC")
            ) {
                continue;
            }

            const valor = parseFloat(valorStr);

            const ano = parseInt(dataPostagem.substring(0, 4));
            const mes = parseInt(dataPostagem.substring(4, 6)) - 1;
            const dia = parseInt(dataPostagem.substring(6, 8));
            const dataFormatada = new Date(Date.UTC(ano, mes, dia, 12, 0, 0));

            // ==========================================
            // REGRAS DE LIMPEZA E FORMATAÇÃO
            // ==========================================
            let isPix = descricao.includes('PIX') || descricao.includes('TRANSFE');
            let foundCategoryId = defaultCategory?.id;
            let overrideType: "Investimento" | "Receita" | "Transferência" | null = null;

            const getCategoriaId = (nomeDesejado: string) => {
                const normalizar = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                const cat = categories.find((c: any) => normalizar(c.name) === normalizar(nomeDesejado));
                return cat ? cat.id : foundCategoryId;
            };

            // 1. Regra: Salário
            if (descricao.includes("PAG DIVERSO/DRH") || descricao.includes("PAG DIVERSO")) {
                descricao = "SALARIO";
                foundCategoryId = getCategoriaId("SALARIO");
            }
            // 2. Regra: Cruzeiro do Sul
            else if (descricao.includes("CRUZEIRO DO SUL")) {
                descricao = "PIX - CRUZEIRO DO SUL";
                foundCategoryId = getCategoriaId("EDUCACAO");
            }
            // 3. Regra: Serginho Team
            else if (descricao.includes("SERGINHO TEAM")) {
                descricao = "PIX - SERGINHO TEAM";
                foundCategoryId = getCategoriaId("ACADEMIA");
            }
            // 4. Regra: Metrô (Cartão de Débito)
            else if (descricao.includes("PMBMETRO") || descricao.includes("TOP SP TAR")) {
                descricao = "CARTÃO DÉBITO - METRO";
                foundCategoryId = getCategoriaId("TRANSPORTE");
            }
            // 5. Regra: Cartão de Débito Visa Electron Geral
            else if (descricao.includes("VISA ELECTRON") || descricao.includes("CARTAO VISA ELECTRON")) {
                let loja = descricao
                    .replace(/CARTAO VISA ELECTRON/g, '')
                    .replace(/VISA ELECTRON/g, '')
                    .replace(/[0-9]{2}\/[0-9]{2}/g, '')
                    .replace(/[-:]/g, ' ')
                    .trim()
                    .replace(/\s+/g, ' ');
                descricao = `CARTÃO DÉBITO - ${loja}`;
            }

                // ==========================================
                // REGRAS ESPECÍFICAS DO BANCO INTER
                // ==========================================
            // 6. Regra Inter: Aplicação de Investimento
            else if (descricao.includes("APLICACAO: \"CDB") || descricao.includes("APLICACAO: \"LCI")) {
                const tipoInvest = descricao.includes("CDB") ? "CDB" : "LCI";
                descricao = `APLICAÇÃO INTER - ${tipoInvest}`;
                foundCategoryId = getCategoriaId("RENDA FIXA");
                overrideType = "Investimento"; // Subtrai da conta, vai pros investimentos
            }
            // 7. Regra Inter: Resgate de Investimento
            else if (descricao.includes("RESGATE: \"CDB") || descricao.includes("RESGATE: \"LCI")) {
                const tipoInvest = descricao.includes("CDB") ? "CDB" : "LCI";
                descricao = `RESGATE INTER - ${tipoInvest}`;
                foundCategoryId = getCategoriaId("RENDA FIXA");
                overrideType = "Investimento"; // Soma na conta, subtrai dos investimentos
            }

            // 8. Regra: Arthur Augusto (Transferências entre contas próprias)
            else if (descricao.includes("ARTHUR AUGUSTO QUAGLIUO LIMA") || descricao.includes("ARTHUR AUGUSTO QUAGLIO LIMA")) {
                descricao = "TRANSFERÊNCIA DE CONTAS";
                foundCategoryId = getCategoriaId("OUTROS"); // Pode deixar em outros ou criar categoria Transferência
                overrideType = "Transferência"; // NUNCA CONTA COMO GASTO NEM RECEITA!
            }

            // 9. Regras Gerais de PIX (Limpa lixos do Bradesco E do Banco Inter)
            else if (isPix) {
                let cleanName = descricao
                    .replace(/PIX RECEBIDO:\s*"CP\s*:[0-9]*-/g, '')
                    .replace(/PIX ENVIADO:\s*"CP\s*:[0-9]*-/g, '')
                    .replace(/PIX\s*QR\s*CODE\s*DINAMICO/g, '')
                    .replace(/PIX\s*QRCODE\s*DIN/g, '')
                    .replace(/TRANSFE\s*PIX/g, '')
                    .replace(/PIX\s*TRANSF[A-Z]*/g, '')
                    .replace(/TRANSFERENCIA\s*PIX/g, '')
                    .replace(/TRANSFE/g, '')
                    .replace(/PIX\s*ENVIADO/g, '')
                    .replace(/PIX\s*RECEBIDO/g, '')
                    .replace(/DES:/g, '')
                    .replace(/NOME:/g, '')
                    .replace(/\bREM\b/g, '')
                    .replace(/REMETENTE/g, '')
                    .replace(/\bEV\b/g, '')
                    .replace(/[0-9]{2}\/[0-9]{2}/g, '')
                    .replace(/[-:"]/g, ' ')
                    .trim()
                    .replace(/\s+/g, ' ');

                if (cleanName) {
                    const primeiroNome = cleanName.split(' ')[0];

                    // A MÁGICA DE CORREÇÃO ESTÁ AQUI:
                    if (primeiroNome === 'ARTHUR') {
                        descricao = "TRANSFERÊNCIA DE CONTAS";
                        foundCategoryId = getCategoriaId("OUTROS");
                        overrideType = "Transferência";
                    } else {
                        descricao = `PIX - ${primeiroNome}`;
                    }
                } else {
                    descricao = "PIX";
                }

                if (descricao.includes("UBER") || cleanName.includes("UBER")) {
                    foundCategoryId = getCategoriaId("TRANSPORTE");
                } else if (overrideType !== "Transferência") {
                    // Só aplica a regra de Lazer se NÃO for uma transferência sua
                    const isEmpresa = descricao.match(/(LTDA|S\.A|PAGAMENTOS|PAGSEGURO|MERCADO PAGO|IFOOD|99APP|INSTITUICAO|BANK|BANCO)/);
                    if (!isEmpresa) {
                        foundCategoryId = getCategoriaId("LAZER");
                    }
                }
            }

            // 10. Regra global: Tudo que tem INVEST é Renda Fixa
            if (descricao.includes("INVEST")) {
                foundCategoryId = getCategoriaId("RENDA FIXA");
            }

            // 11. Fallback: Se não caiu em nenhuma regra, tenta o categorizador geral do arquivo categorizer.ts
            if (foundCategoryId === defaultCategory?.id && !descricao.includes("INVEST") && !isPix && descricao !== "SALARIO" && !descricao.includes("APLICACAO:") && !descricao.includes("RESGATE:")) {
                try {
                    const suggestedName = identifyCategory(descricao);
                    foundCategoryId = getCategoriaId(suggestedName);
                } catch (e) {}
            }

            transacoes.push({
                id: idTransacao,
                date: dataFormatada,
                name: descricao,
                value: valor,
                categoryId: foundCategoryId,
                creditCardId: null,
                bankAccountId: selectedBankAccountId,
                selected: true,
                overrideType: overrideType
            });
        }

        return transacoes;
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedBankAccountId) {
            alert("Por favor, selecione uma Conta Bancária antes de importar.");
            return;
        }

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const conteudo = e.target?.result as string;
            if (conteudo) {
                const dadosProcessados = processarOFX(conteudo);
                if (dadosProcessados.length === 0) {
                    alert("Nenhuma transação válida encontrada ou formato OFX inválido.");
                } else {
                    setParsedData(dadosProcessados);
                    setIsReviewing(true);
                }
            }
            setIsImporting(false);
            event.target.value = '';
        };

        reader.readAsText(file);
    };

    const updateTransaction = (id: string, field: keyof ParsedTransaction, value: any) => {
        setParsedData(prev => prev.map(tx => {
            if (tx.id === id) {
                return { ...tx, [field]: value };
            }
            return tx;
        }));
    };

    const handleConfirmImport = async () => {
        setIsImporting(true);
        const transactionsToImport = parsedData.filter(tx => tx.selected);

        if (transactionsToImport.length > 0) {
            const response = await importReviewedTransactions(transactionsToImport);
            if (response?.error) {
                alert(response.error);
            } else {
                alert(`${transactionsToImport.length} transações salvas com sucesso!`);
                setIsReviewing(false);
            }
        }
        setIsImporting(false);
    };

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-zinc-100 outline-none h-10 w-full md:w-48"
            >
                <option value="" disabled>Selecione a Conta...</option>
                {bankAccounts?.map(b => (
                    <option key={b.id} value={b.id}>🏦 {b.name}</option>
                ))}
            </select>

            <input
                type="file"
                accept=".ofx"
                onChange={handleFileUpload}
                className="hidden"
                id="ofx-upload"
                disabled={isImporting || !selectedBankAccountId}
            />
            <label htmlFor="ofx-upload" className="w-full md:w-auto">
                <Button
                    variant="outline"
                    asChild
                    className={`w-full border-zinc-800 bg-zinc-900/50 hover:bg-emerald-500/10 hover:text-emerald-500 gap-2 h-10 ${!selectedBankAccountId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <span>
                        {isImporting && !isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        {isImporting && !isReviewing ? "A ler ficheiro..." : "Importar OFX"}
                    </span>
                </Button>
            </label>

            <Dialog open={isReviewing} onOpenChange={setIsReviewing}>
                <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[90vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-4 md:p-6">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-2xl font-bold text-emerald-500">Revisão de Extrato OFX</DialogTitle>
                        <DialogDescription className="text-zinc-400 text-base">
                            Ajuste os nomes, modifique as datas, selecione as categorias e associe a cartões antes de salvar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 mt-4 pb-4">
                        {parsedData.map((tx) => (
                            <div
                                key={tx.id}
                                className={`flex flex-col xl:flex-row items-start xl:items-center gap-4 p-4 rounded-xl border transition-colors ${
                                    tx.selected
                                        ? 'border-zinc-700 bg-zinc-900/80 shadow-sm'
                                        : 'border-zinc-800/50 bg-zinc-950 opacity-50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={tx.selected}
                                    onChange={(e) => updateTransaction(tx.id, 'selected', e.target.checked)}
                                    className="w-6 h-6 accent-emerald-500 rounded cursor-pointer shrink-0 mt-1 xl:mt-0"
                                />
                                <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-4 w-full items-center">
                                    <div className="xl:col-span-2">
                                        <input
                                            type="date"
                                            value={tx.date.toISOString().substring(0, 10)}
                                            onChange={(e) => {
                                                if(e.target.value) {
                                                    const newDate = new Date(`${e.target.value}T12:00:00Z`);
                                                    updateTransaction(tx.id, 'date', newDate);
                                                }
                                            }}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-800 border border-zinc-700 hover:border-emerald-500/50 rounded-lg p-2.5 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                        />
                                    </div>
                                    <div className="xl:col-span-4">
                                        <input
                                            type="text"
                                            value={tx.name}
                                            onChange={(e) => updateTransaction(tx.id, 'name', e.target.value)}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            placeholder="Nome da transação"
                                        />
                                    </div>
                                    <div className={`xl:col-span-2 text-base font-bold xl:text-right ${tx.value > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {tx.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                    <div className="xl:col-span-2">
                                        <select
                                            value={tx.categoryId}
                                            onChange={(e) => updateTransaction(tx.id, 'categoryId', e.target.value)}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="xl:col-span-2">
                                        <select
                                            value={tx.creditCardId || ""}
                                            onChange={(e) => updateTransaction(tx.id, 'creditCardId', e.target.value || null)}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                        >
                                            <option value="">(Conta Corrente)</option>
                                            {creditCards.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 mt-auto border-t border-zinc-800 flex justify-between items-center bg-zinc-950">
                        <span className="text-base text-zinc-400">
                            Selecionadas: <strong className="text-zinc-100 text-lg">{parsedData.filter(t => t.selected).length}</strong> de {parsedData.length}
                        </span>
                        <div className="flex gap-4">
                            <Button variant="ghost" size="lg" onClick={() => setIsReviewing(false)}>Cancelar</Button>
                            <Button
                                size="lg"
                                onClick={handleConfirmImport}
                                disabled={isImporting || parsedData.filter(t => t.selected).length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            >
                                {isImporting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                                Salvar Selecionadas
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}