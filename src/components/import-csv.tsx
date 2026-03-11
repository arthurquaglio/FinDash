// src/components/import-csv.tsx
"use client";

import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { importReviewedTransactions } from "@/app/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { identifyCategory } from "@/lib/categorizer";

interface ImportCSVProps {
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

export function ImportCSV({ categories, creditCards }: ImportCSVProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);

    const parseBrValue = (val: string) => {
        if (!val || val.trim() === "" || val === "0,00") return 0;
        return parseFloat(val.replace(/\./g, "").replace(",", "."));
    };

    const parseBrDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/").map(Number);
        return new Date(year, month - 1, day);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        Papa.parse(file, {
            delimiter: ";",
            skipEmptyLines: true,
            complete: async (results) => {
                const dataStartIndex = results.data.findIndex((row: any) => row[0] === "Data");
                if (dataStartIndex === -1) {
                    alert("Formato de extrato Bradesco não reconhecido.");
                    setIsImporting(false);
                    return;
                }

                const rawRows = results.data.slice(dataStartIndex + 1);
                const defaultCategory = categories[0];

                const formattedData: ParsedTransaction[] = rawRows
                    .map((row: any, index: number) => {
                        const dataStr = row[0];
                        const historico = row[1];
                        const credito = parseBrValue(row[3]);
                        const debito = parseBrValue(row[4]);

                        if (!dataStr || dataStr.includes("/") === false || historico.includes("Total")) return null;

                        const value = credito > 0 ? credito : -debito;

                        // Tenta adivinhar a categoria usando a nossa lógica
                        let foundCategoryId = defaultCategory?.id;
                        try {
                            const suggestedName = identifyCategory(historico);
                            const matchedCat = categories.find((c: any) => c.name.toLowerCase() === suggestedName.toLowerCase());
                            if (matchedCat) foundCategoryId = matchedCat.id;
                        } catch (e) {
                            // Silencioso se falhar
                        }

                        return {
                            id: `temp-${index}`,
                            date: parseBrDate(dataStr),
                            name: historico,
                            value: value,
                            categoryId: foundCategoryId,
                            creditCardId: null,
                            selected: true, // Começa selecionado para importar
                        };
                    })
                    .filter((t: any) => t !== null && t.value !== 0) as ParsedTransaction[];

                setParsedData(formattedData);
                setIsReviewing(true); // Abre o Modal de Revisão
                setIsImporting(false);

                // Limpa o input file para permitir importar o mesmo ficheiro de novo se precisar
                event.target.value = '';
            },
        });
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
        // Filtra apenas os que o utilizador deixou com a checkbox marcada
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
        <div>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                disabled={isImporting}
            />
            <label htmlFor="csv-upload">
                <Button
                    variant="outline"
                    asChild
                    className="border-zinc-800 bg-zinc-900/50 hover:bg-emerald-500/10 hover:text-emerald-500 gap-2 cursor-pointer"
                >
                    <span>
                        {isImporting && !isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        {isImporting && !isReviewing ? "Lendo arquivo..." : "Importar Bradesco"}
                    </span>
                </Button>
            </label>

            {/* MODAL DE REVISÃO DA IMPORTAÇÃO */}
            <Dialog open={isReviewing} onOpenChange={setIsReviewing}>
                <DialogContent className="max-w-5xl bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-emerald-500">Revisão de Extrato</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Confirme as categorias, associe a cartões ou desmarque o que não quer importar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 mt-4">
                        {parsedData.map((tx) => (
                            <div
                                key={tx.id}
                                className={`flex flex-col md:flex-row items-start md:items-center gap-3 p-3 rounded-lg border transition-colors ${
                                    tx.selected
                                        ? 'border-zinc-700 bg-zinc-900/50'
                                        : 'border-zinc-800/50 bg-zinc-950 opacity-40'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={tx.selected}
                                    onChange={(e) => updateTransaction(tx.id, 'selected', e.target.checked)}
                                    className="w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0 mt-1 md:mt-0"
                                />
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 w-full items-center">
                                    <div className="md:col-span-2 text-xs text-zinc-400">
                                        {tx.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </div>
                                    <div className="md:col-span-4 text-sm font-medium text-zinc-200 truncate" title={tx.name}>
                                        {tx.name}
                                    </div>
                                    <div className={`md:col-span-2 text-sm font-bold md:text-right ${tx.value > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                        {tx.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>

                                    {/* Select de Categoria */}
                                    <div className="md:col-span-2">
                                        <select
                                            value={tx.categoryId}
                                            onChange={(e) => updateTransaction(tx.id, 'categoryId', e.target.value)}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-300 focus:ring-emerald-500 outline-none"
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Select de Cartão */}
                                    <div className="md:col-span-2">
                                        <select
                                            value={tx.creditCardId || ""}
                                            onChange={(e) => updateTransaction(tx.id, 'creditCardId', e.target.value || null)}
                                            disabled={!tx.selected}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-zinc-300 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="">(Sem Cartão)</option>
                                            {creditCards.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 mt-4 border-t border-zinc-800 flex justify-between items-center">
                        <span className="text-sm text-zinc-400">
                            Selecionadas: <strong className="text-zinc-100">{parsedData.filter(t => t.selected).length}</strong> de {parsedData.length}
                        </span>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setIsReviewing(false)}>Cancelar</Button>
                            <Button
                                onClick={handleConfirmImport}
                                disabled={isImporting || parsedData.filter(t => t.selected).length === 0}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Salvar Selecionadas
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}