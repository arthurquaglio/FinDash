"use client";

import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Papa from "papaparse";
import { importTransactions } from "@/app/actions";

export function ImportCSV() {
    const [isImporting, setIsImporting] = useState(false);

    const parseBrValue = (val: string) => {
        if (!val || val.trim() === "" || val === "0,00") return 0;
        // Remove pontos de milhar e troca vírgula por ponto
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
                // O Bradesco tem lixo no topo. Procuramos a linha que começa com "Data"
                const dataStartIndex = results.data.findIndex((row: any) => row[0] === "Data");
                if (dataStartIndex === -1) {
                    alert("Formato de extrato Bradesco não reconhecido.");
                    setIsImporting(false);
                    return;
                }

                // Pegamos os dados a partir da linha após o cabeçalho "Data;Histórico..."
                const rawRows = results.data.slice(dataStartIndex + 1);

                const formattedData = rawRows
                    .map((row: any) => {
                        const dataStr = row[0];
                        const historico = row[1];
                        const credito = parseBrValue(row[3]);
                        const debito = parseBrValue(row[4]);

                        // Se não tem data ou o histórico é o saldo final, ignora
                        if (!dataStr || dataStr.includes("/") === false || historico.includes("Total")) return null;

                        return {
                            date: parseBrDate(dataStr),
                            name: historico,
                            value: credito > 0 ? credito : -debito,
                        };
                    })
                    .filter((t: any) => t !== null && t.value !== 0);

                if (formattedData.length > 0) {
                    await importTransactions(formattedData);
                    alert(`${formattedData.length} transações importadas!`);
                }

                setIsImporting(false);
            },
        });
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
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {isImporting ? "Importando..." : "Importar Bradesco"}
          </span>
                </Button>
            </label>
        </div>
    );
}