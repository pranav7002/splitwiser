import { ScrollReveal } from "@/components/ScrollReveal";
import { Check, AlertCircle } from "lucide-react";

const MEMBER_COLORS = [
  "bg-[hsl(239,84%,67%)]",
  "bg-[hsl(38,92%,60%)]",
  "bg-[hsl(152,60%,45%)]",
  "bg-[hsl(280,60%,60%)]",
  "bg-[hsl(0,72%,60%)]",
];

function truncAddr(addr?: string) {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function MemberSidebar({ members, groupId }: { members?: any[], groupId?: string }) {
  if (!members) return null;

  return (
    <ScrollReveal direction="left" className="hidden lg:block">
      <div>
        <p className="section-label mb-4">Members</p>
        <div className="space-y-1">
          {members.map((m, i) => (
            <div
              key={m.userId}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${MEMBER_COLORS[i % MEMBER_COLORS.length]}`}
              >
                {m.walletAddress?.slice(2, 4)?.toUpperCase() || "??"}
              </div>
              <span className="text-sm font-mono font-medium flex-1 truncate">{truncAddr(m.walletAddress)}</span>
              {m.joined ? (
                <Check className="h-4 w-4 text-[hsl(152,60%,45%)]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[hsl(38,92%,50%)]" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1">Vault ID</p>
          <p className="text-xs font-mono text-muted-foreground break-all">{groupId}</p>
        </div>
      </div>
    </ScrollReveal>
  );
}
