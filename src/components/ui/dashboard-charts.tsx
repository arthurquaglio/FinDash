// src/components/ui/dashboard-charts.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export function DashboardCharts({ data }: { data: any[] }) {
    return (
        <Card className="lg:col-span-2 bg-zinc-900/50 border-zinc-800">
            <CardHeader><CardTitle className="text-sm font-medium text-zinc-400">Distribuição de Capital</CardTitle></CardHeader>
            <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: any) =>
                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
                            }
                            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px" }}
                            itemStyle={{ color: "#fff" }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}