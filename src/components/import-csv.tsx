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
                            selected: true,
                        };
                    })
                    .filter((t: any) => t !== null && t.value !== 0) as ParsedTransaction[];

                setParsedData(formattedData);
                setIsReviewing(true);
                setIsImporting(false);

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

            <Dialog open={isReviewing} onOpenChange={setIsReviewing}>
                {/* sm:max-w-[95vw] FORÇA o modal a ficar com 95% da largura da tela no desktop */}
                <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[90vh] bg-zinc-950 border-zinc-800 text-zinc-100 flex flex-col p-4 md:p-6">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-2xl font-bold text-emerald-500">Revisão de Extrato</DialogTitle>
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

                                    {/* Edição de Data com Date Picker Nativo */}
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

                                    {/* Valor Fixo (Apenas visualização) */}
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