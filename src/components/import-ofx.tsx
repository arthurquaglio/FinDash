"use client";

import React, { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importReviewedTransactions } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { identifyCategory } from "@/lib/categorizer";

interface ImportOFXProps {
    categories: any[];
    creditCards: any[];
}

type ParsedTransaction = {
    id: string;
    date: Date;
    name: string;
    value: number;
    categoryId: string;
    creditCardId: string | null;
    selected: boolean;
};

export function ImportOFX({ categories, creditCards }: ImportOFXProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);

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

            const dataPostagem = extrairValor('DTPOSTED', bloco); // Ex: 20260309000000[-03:EST]
            const valorStr = extrairValor('TRNAMT', bloco);
            const descricao = extrairValor('MEMO', bloco) || extrairValor('NAME', bloco) || "Transação Desconhecida";
            const idTransacao = extrairValor('FITID', bloco) || `temp-${Math.random()}`;

            if (!dataPostagem || !valorStr) continue;

            const valor = parseFloat(valorStr);

            // Converter a data do formato OFX (YYYYMMDD...) para Date do JS
            const ano = parseInt(dataPostagem.substring(0, 4));
            const mes = parseInt(dataPostagem.substring(4, 6)) - 1; // Mês começa em 0 no JS
            const dia = parseInt(dataPostagem.substring(6, 8));
            const dataFormatada = new Date(Date.UTC(ano, mes, dia, 12, 0, 0)); // Meio-dia UTC para evitar fuso horário puxando 1 dia para trás

            // Categorização Automática Inteligente
            let foundCategoryId = defaultCategory?.id;
            try {
                const suggestedName = identifyCategory(descricao);
                const matchedCat = categories.find((c: any) => c.name.toLowerCase() === suggestedName.toLowerCase());
                if (matchedCat) foundCategoryId = matchedCat.id;
            } catch (e) {
                // Silencioso se falhar
            }

            transacoes.push({
                id: idTransacao,
                date: dataFormatada,
                name: descricao,
                value: valor,
                categoryId: foundCategoryId,
                creditCardId: null,
                selected: true,
            });
        }

        return transacoes;
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = (e) => {
            const conteudo = e.target?.result as string;
            if (conteudo) {
                const dadosProcessados = processarOFX(conteudo);
                if (dadosProcessados.length === 0) {
                    alert("Nenhuma transação encontrada ou formato OFX inválido.");
                } else {
                    setParsedData(dadosProcessados);
                    setIsReviewing(true);
                }
            }
            setIsImporting(false);
            event.target.value = ''; // Limpa o input
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

    // O retorno (JSX) permanece idêntico ao seu modal de revisão que já estava perfeito
    return (
        <div>
            <input
                type="file"
                accept=".ofx"
                onChange={handleFileUpload}
                className="hidden"
                id="ofx-upload"
                disabled={isImporting}
            />
            <label htmlFor="ofx-upload">
                <Button
                    variant="outline"
                    asChild
                    className="border-zinc-800 bg-zinc-900/50 hover:bg-emerald-500/10 hover:text-emerald-500 gap-2 cursor-pointer"
                >
                    <span>
                        {isImporting && !isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        {isImporting && !isReviewing ? "Lendo arquivo..." : "Importar OFX"}
                    </span>
                </Button>
            </label>

            <Dialog open={isReviewing} onOpenChange={setIsReviewing}>
                <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[90vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-4 md:p-6">
                    {/* ... (T0do o seu código de cabeçalho e listagem do Modal fica exatamente igual aqui) ... */}
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

                                    {/* Edição de Data */}
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

                                    {/* Edição de Nome */}
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

                                    {/* Valor Fixo */}
                                    <div className={`xl:col-span-2 text-base font-bold xl:text-right ${tx.value > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {tx.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>

                                    {/* Select de Categoria */}
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

                                    {/* Select de Cartão */}
                                    <div className="xl:col-span-2">
                                        <select
                                            value={tx.creditCardId || ""}
                                            onChange={(e) => updateTransaction(tx.id, 'creditCardId', e.target.value || null)}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-100 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                                        >
                                            <option value="">(Conta / Dinheiro)</option>
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