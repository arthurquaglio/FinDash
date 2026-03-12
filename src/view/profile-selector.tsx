"use client";

import { useState } from "react";
import { Users, User, ChevronDown, Loader2 } from "lucide-react";
import { setActiveProfile } from "@/app/actions";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/view/ui/dropdown-menu";

export function ProfileSelector({ users, activeId }: { users: any[], activeId: string | undefined }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const activeUser = users.find(u => u.id === activeId);

    async function handleSelect(id: string) {
        if (id === activeId || (id === "casal" && !activeId)) return;

        setLoading(true);
        await setActiveProfile(id);
        router.refresh(); // Recarrega a página atualizando todos os dados
        setLoading(false);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-between w-full p-3 border border-zinc-800 bg-zinc-900/50 rounded-xl hover:bg-zinc-800 transition-all outline-none group">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:bg-emerald-500 group-hover:text-zinc-950 transition-colors">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (activeUser ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />)}
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
                            {activeUser ? activeUser.name : "Visão do Casal"}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                            {activeUser ? "Perfil Individual" : "Todas as transações"}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-[200px] bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl">
                <DropdownMenuItem onClick={() => handleSelect("casal")} className="cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-500 py-3 gap-2">
                    <Users className="w-4 h-4" /> Visão do Casal
                </DropdownMenuItem>

                {users.map(u => (
                    <DropdownMenuItem key={u.id} onClick={() => handleSelect(u.id)} className="cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-500 py-3 gap-2">
                        <User className="w-4 h-4" /> {u.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}