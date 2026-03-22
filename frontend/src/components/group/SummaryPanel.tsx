import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Check } from "lucide-react";

interface SummaryPanelProps {
  isSettled: boolean;
  onSettle: () => void;
}

export function SummaryPanel({ isSettled, onSettle }: SummaryPanelProps) {
  return (
    <ScrollReveal direction="right" className="space-y-5">
      {/* Position card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="section-label mb-3">My Position</p>
        <div className="text-4xl font-semibold tabular text-[hsl(152,60%,35%)] mb-1">
          +₹1,400
          </div>
          <p className="text-xs text-muted-foreground">You are owed this amount</p>
          </div>

      {/* Vault balance */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="section-label mb-3">Vault Balance</p>
        <div className="text-3xl font-semibold tabular mb-3">₹9,000</div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Expenses</span>
          <span className="font-medium tabular">₹9,000</span>
         </div>
         </div>

         {/* Agent Status */}
<div className="rounded-2xl border border-border bg-card p-6">
  <p className="section-label mb-3">Agent Status</p>
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-medium">Settlement Agent</span>
    <span className="text-xs font-mono px-2 py-1 rounded-full bg-blue-50 text-blue-600 flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
      MONITORING
    </span>
  </div>
  <div className="bg-muted rounded-lg p-2.5 font-mono text-[10px] leading-7">
    <div className="flex gap-2">
      <span className="text-purple-500">21:32</span>
      <span className="text-green-600">Chain state synced</span>
    </div>
    <div className="flex gap-2">
      <span className="text-purple-500">21:28</span>
      <span className="text-yellow-600">New expense detected</span>
    </div>
    <div className="flex gap-2">
      <span className="text-purple-500">21:15</span>
      <span className="text-green-600">Graph netting computed</span>
    </div>
  </div>
</div>

{/* ZK Proof Steps */}
<div className="rounded-2xl border border-border bg-card p-6">
  <p className="section-label mb-3">ZK Proof — Taj Dinner</p>
  <div className="space-y-2">
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-[11px] text-green-600">✓</div>
      <span className="text-xs flex-1 text-gray-700">Witness generated</span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-50 text-green-600">done</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-[11px] text-green-600">✓</div>
      <span className="text-xs flex-1 text-gray-700">Circuit compiled</span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-50 text-green-600">done</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center text-[11px] text-yellow-600">⟳</div>
      <span className="text-xs flex-1 text-yellow-600">Proof generation</span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">~12s</span>
    </div>
    <div className="flex items-center gap-2.5">
      <div className="w-5 h-5 rounded-full bg-gray-50 flex items-center justify-center text-[11px] text-gray-400 border border-gray-200">○</div>
      <span className="text-xs flex-1 text-gray-400">On-chain verification</span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">waiting</span>
    </div>
  </div>
  <p className="font-mono text-[10px] text-gray-400 mt-3 break-all">
    Proof ID: 0x3f8a...c19d
  </p>
  </div>

      {/* Settlement trigger */}
      <div>
        {!isSettled ? (
          <Button className="w-full h-12 rounded-xl text-sm" onClick={onSettle}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Settlement Options
          </Button>
        ) : (
          <div className="w-full h-12 rounded-xl bg-success flex items-center justify-center gap-2">
            <Check className="h-4 w-4 text-success-foreground" />
            <span className="text-sm font-medium text-success-foreground">Settlement complete</span>
          </div>
        )}
      </div>
    </ScrollReveal>
  );
}
