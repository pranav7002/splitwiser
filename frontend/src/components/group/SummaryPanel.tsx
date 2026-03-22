import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check, SearchCode } from "lucide-react";
import { useState } from "react";
import { ZkExplorerSheet } from "../settlement/ZkExplorerSheet";

interface SummaryPanelProps {
  totals?: any;
  myBalance?: string | number;
  isSettled: boolean;
  activeJob?: { jobId: string; status: string } | null;
  lastSettlement?: any;
  onSettle: () => void;
}

export function SummaryPanel({ totals, myBalance, isSettled, activeJob, lastSettlement, onSettle }: SummaryPanelProps) {
  const balance = Number(myBalance || 0);
  const isProcessing = activeJob && (activeJob.status === "pending" || activeJob.status === "processing");
  const [showZkExplorer, setShowZkExplorer] = useState(false);

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
          <Button 
            className="w-full h-12 rounded-xl text-sm transition-all duration-300 relative overflow-hidden" 
            onClick={onSettle}
            disabled={Number(totals?.totalPositive || 0) === 0 || !!isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="absolute inset-0 bg-primary/20 animate-pulse-soft" />
                <span className="relative flex items-center">
                  <span className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin-slow" />
                  Settlement Processing...
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Settle via ZK Proof
              </>
            )}
          </Button>
        ) : lastSettlement?.proofDetails?.proof ? (
          <Button 
            onClick={() => setShowZkExplorer(true)}
            variant="outline"
            className="w-full h-12 rounded-xl border-[hsl(152,60%,45%)] text-[hsl(152,60%,40%)] hover:bg-[hsl(152,60%,95%)] flex items-center justify-center gap-2"
          >
            <SearchCode className="h-4 w-4" />
            View ZK Verification Data
          </Button>
        ) : (
          <div className="w-full h-12 rounded-xl bg-[hsl(152,60%,94%)] border border-[hsl(152,60%,80%)] flex items-center justify-center gap-2">
            <Check className="h-4 w-4 text-[hsl(152,60%,35%)]" />
            <span className="text-sm font-medium text-[hsl(152,60%,25%)]">Settlement complete</span>
          </div>
        )}
      </div>

      <ZkExplorerSheet 
        open={showZkExplorer} 
        onClose={() => setShowZkExplorer(false)} 
        proofData={lastSettlement} 
      />
    </ScrollReveal>
  );
}
