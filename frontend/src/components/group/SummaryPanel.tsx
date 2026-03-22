import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check } from "lucide-react";

interface SummaryPanelProps {
  totals?: any;
  myBalance?: string | number;
  isSettled: boolean;
  onSettle: () => void;
}

export function SummaryPanel({ totals, myBalance, isSettled, onSettle }: SummaryPanelProps) {
  const balance = Number(myBalance || 0);

  return (
    <ScrollReveal direction="right" className="space-y-5">
      {/* Position card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="section-label mb-3">My Position</p>
        <div className={`text-4xl font-semibold tabular mb-1 ${balance >= 0 ? "text-[hsl(152,60%,35%)]" : "text-[hsl(0,72%,50%)]"}`}>
          {balance > 0 ? '+' : ''}₹{Math.abs(balance).toLocaleString('en-IN')}
        </div>
        <p className="text-xs text-muted-foreground">
          {balance > 0 ? "You are owed this amount" : balance < 0 ? "You owe this amount" : "All settled up"}
        </p>
      </div>

      {/* Vault balance */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="section-label mb-3">Vault Balance</p>
        <div className="text-3xl font-semibold tabular mb-3">₹{Number(totals?.totalAmount || totals?.totalPositive || 0).toLocaleString('en-IN')}</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Owed</span>
            <span className="font-medium tabular text-[hsl(152,60%,35%)]">
              +₹{Number(totals?.totalPositive || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Debts</span>
            <span className="font-medium tabular text-[hsl(0,72%,50%)]">
              -₹{Number(totals?.totalNegative || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Settlement trigger */}
      <div>
        {!isSettled ? (
          <Button className="w-full h-12 rounded-xl text-sm" onClick={onSettle}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Settle via ZK Proof
          </Button>
        ) : (
          <div className="w-full h-12 rounded-xl bg-[hsl(152,60%,94%)] border border-[hsl(152,60%,80%)] flex items-center justify-center gap-2">
            <Check className="h-4 w-4 text-[hsl(152,60%,35%)]" />
            <span className="text-sm font-medium text-[hsl(152,60%,25%)]">Settlement complete</span>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
