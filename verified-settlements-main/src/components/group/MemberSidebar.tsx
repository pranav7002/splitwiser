import { ScrollReveal } from "@/components/ScrollReveal";
import { Check, AlertCircle } from "lucide-react";

const MEMBER_COLORS = [
  "bg-[hsl(239,84%,67%)]",
  "bg-[hsl(38,92%,60%)]",
  "bg-[hsl(152,60%,45%)]",
  
];

const MEMBERS = [
  { id: "1", name: "Tanishka", status: "settled" as const },
  { id: "2", name: "Pranav",   status: "pending" as const },
  { id: "3", name: "Mihir",    status: "pending" as const },
];

export function MemberSidebar() {
  return (
    <ScrollReveal direction="left" className="hidden lg:block">
      <div>
        <p className="section-label mb-4">Members</p>
        <div className="space-y-1">
          {MEMBERS.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${MEMBER_COLORS[i % MEMBER_COLORS.length]}`}
              >
                {m.name[0]}
              </div>
              <span className="text-sm font-medium flex-1">{m.name}</span>
              {m.status === "settled" ? (
                <Check className="h-4 w-4 text-[hsl(152,60%,45%)]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[hsl(38,92%,50%)]" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-1">Vault ID</p>
          <p className="text-xs font-mono text-muted-foreground">0x1a2b…3c4d</p>
        </div>
      </div>
    </ScrollReveal>
  );
}
