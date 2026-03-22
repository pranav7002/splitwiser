import { useState, useEffect, useCallback } from "react";
import { Lock, Shield, Check, Copy, Cpu, ArrowRight, Fingerprint, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type CinematicPhase =
  | "idle"
  | "committing"
  | "committed"
  | "step-canonicalize"
  | "step-algorithm"
  | "step-journal"
  | "step-proof"
  | "step-verify"
  | "proved"
  | "executing"
  | "settled";

interface SettlementCinematicProps {
  open: boolean;
  onClose: () => void;
  onSettled: () => void;
}

const BALANCES = [
  { name: "Tanishka", amount: 1400,  direction: "owed" as const },
  { name: "Pranav",   amount: -600,  direction: "owes" as const },
  { name: "Mihir",    amount: -800,  direction: "owes" as const },
];

const SETTLEMENTS = [
  { from: "Pranav", to: "Tanishka", amount: 600 },
  { from: "Mihir",  to: "Tanishka", amount: 800 },
];

const PROOF_STEPS = [
  { id: "canonicalize", label: "Canonicalizing balances", log: "balances committed" },
  { id: "algorithm", label: "Running settlement algorithm", log: "algorithm executed" },
  { id: "journal", label: "Committing journal", log: "journal sealed" },
  { id: "proof", label: "Generating proof", log: "receipt generated" },
  { id: "verify", label: "Verifying receipt shape", log: "receipt verified ✓" },
];

const INPUT_HASH = "0x7f3a…e91d";
const PROOF_HASH = "0x4b2c8e…f7a301d9";
const ALGO_VERSION = "v1.2.0";

export function SettlementCinematic({ open, onClose, onSettled }: SettlementCinematicProps) {
  const [phase, setPhase] = useState<CinematicPhase>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, msg]);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase("idle");
      setLogs([]);
      setCopied(false);
      setElapsedMs(0);
    }
  }, [open]);

  // Timer during proving
  useEffect(() => {
    if (
      phase.startsWith("step-") ||
      phase === "committing" ||
      phase === "committed"
    ) {
      const interval = setInterval(() => setElapsedMs((p) => p + 47), 47);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const startProving = () => {
    setPhase("committing");
    setElapsedMs(0);
   addLog("$ splitwiser prove- group taj-dinner");
    addLog("locking input state...");

    setTimeout(() => {
      setPhase("committed");
      addLog("inputs committed: " + INPUT_HASH);
      addLog("algorithm: debt-simplification " + ALGO_VERSION);
    }, 1200);

    setTimeout(() => {
      setPhase("step-canonicalize");
      addLog("canonicalizing balances...");
    }, 2200);

    setTimeout(() => {
      addLog(PROOF_STEPS[0].log);
      setPhase("step-algorithm");
      addLog("executing settlement inside zkVM...");
    }, 3400);

    setTimeout(() => {
      addLog(PROOF_STEPS[1].log);
      setPhase("step-journal");
      addLog("committing journal entries...");
    }, 4800);

    setTimeout(() => {
      addLog(PROOF_STEPS[2].log);
      setPhase("step-proof");
      addLog("generating STARK proof...");
    }, 6200);

    setTimeout(() => {
      addLog(PROOF_STEPS[3].log);
      setPhase("step-verify");
      addLog("verifying receipt shape...");
    }, 7800);

    setTimeout(() => {
      addLog(PROOF_STEPS[4].log);
      addLog("proof complete: " + PROOF_HASH);
      setPhase("proved");
    }, 9200);
  };

  const executeSettlement = () => {
    setPhase("executing");
    addLog("submitting to smart account...");
    addLog("gas: sponsored via paymaster");
    setTimeout(() => {
      addLog("UserOperation confirmed");
      addLog("settlement finalized ✓");
      setPhase("settled");
      onSettled();
    }, 2500);
  };

  const copyProofHash = () => {
    navigator.clipboard.writeText(PROOF_HASH);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepStatus = (stepId: string) => {
    const stepMap: Record<string, number> = {
      canonicalize: 0,
      algorithm: 1,
      journal: 2,
      proof: 3,
      verify: 4,
    };
    const phaseIndex = phase.startsWith("step-")
      ? stepMap[phase.replace("step-", "")]
      : phase === "proved" || phase === "executing" || phase === "settled"
      ? 5
      : -1;
    const thisIndex = stepMap[stepId];

    if (phaseIndex > thisIndex) return "done";
    if (phaseIndex === thisIndex) return "active";
    return "pending";
  };

  if (!open) return null;

  const isProving = phase.startsWith("step-") || phase === "committing" || phase === "committed";
  const isComplete = phase === "proved" || phase === "executing" || phase === "settled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm transition-opacity duration-500"
        onClick={phase === "settled" ? onClose : undefined}
      />

      {/* Main panel */}
      <div className="relative w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl animate-scale-in">
        {/* Close button */}
        {(phase === "idle" || phase === "settled") && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        {/* Top bar */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Settlement Pipeline</h2>
              <p className="text-[11px] text-muted-foreground">
                {phase === "idle" && "Ready to prove & settle"}
                {isProving && "Generating cryptographic proof…"}
                {phase === "proved" && "Proof verified — ready for execution"}
                {phase === "executing" && "Submitting to smart account…"}
                {phase === "settled" && "Settlement finalized"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground">
              RISC Zero Proof
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground">
              Algorithm {ALGO_VERSION}
            </span>
            {isComplete && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[hsl(152,60%,94%)] text-[hsl(152,60%,28%)]">
                Journal Verified
              </span>
            )}
          </div>
        </div>

        {/* 3-column body */}
        <div className="grid md:grid-cols-[1fr_1.4fr_1fr] divide-x divide-border min-h-[420px]">
          {/* LEFT: Input State */}
          <div className="p-5 space-y-4">
            <p className="section-label">Input State</p>

            <div
              className={`rounded-xl border p-4 space-y-2 transition-all duration-700 ${
                phase !== "idle"
                  ? "border-primary/20 bg-primary/[0.03]"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Balances</span>
                {phase !== "idle" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                )}
              </div>
              {BALANCES.map((b) => (
                <div key={b.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.name}</span>
                  <span
                    className={`font-semibold tabular ${
                      b.direction === "owed"
                        ? "text-[hsl(152,60%,35%)]"
                        : "text-[hsl(0,72%,50%)]"
                    }`}
                  >
                    {b.amount > 0 ? "+" : ""}₹{Math.abs(b.amount).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Input Hash</span>
                <span className="font-mono text-foreground">
                  {phase !== "idle" ? INPUT_HASH : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Algorithm</span>
                <span className="font-mono text-foreground">
                  debt-simplify {ALGO_VERSION}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Group</span>
               <span className="font-mono text-foreground">taj-dinner</span>
              </div>
            </div>

            {phase !== "idle" && (
              <p className="text-[11px] text-primary/70 leading-relaxed pt-2 border-t border-border">
                Inputs committed. Building proof from canonical balances.
              </p>
            )}
          </div>

          {/* CENTER: Proof Forge */}
          <div className="p-5 relative overflow-hidden">
            {/* Subtle background pulse when proving */}
            {isProving && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(239,84%,67%,0.04)_0%,transparent_70%)] animate-pulse-soft" />
              </div>
            )}

            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between">
                <p className="section-label">Proof Generation</p>
                {(isProving || isComplete) && (
                  <span className="text-[11px] font-mono text-muted-foreground tabular">
                    {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Pipeline steps */}
              <div className="space-y-1">
                {PROOF_STEPS.map((step, i) => {
                  const status = getStepStatus(step.id);
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-500 ${
                        status === "active"
                          ? "bg-primary/[0.07]"
                          : status === "done"
                          ? "bg-[hsl(152,60%,97%)]"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 flex-shrink-0 ${
                          status === "done"
                            ? "bg-[hsl(152,60%,45%)] text-white"
                            : status === "active"
                            ? "bg-primary text-primary-foreground animate-pulse-soft"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {status === "done" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-sm transition-colors duration-300 ${
                            status === "active"
                              ? "font-medium text-foreground"
                              : status === "done"
                              ? "font-medium text-[hsl(152,60%,30%)]"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {status === "active" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Terminal log */}
              <div className="rounded-lg bg-[hsl(240,10%,5%)] border border-[hsl(240,6%,15%)] p-3 max-h-[140px] overflow-y-auto">
                <div className="space-y-0.5">
                  {logs.length === 0 && (
                    <p className="text-[11px] font-mono text-[hsl(240,4%,40%)]">
                      awaiting proof request…
                    </p>
                  )}
                  {logs.map((log, i) => (
                    <p
                      key={i}
                      className={`text-[11px] font-mono leading-relaxed ${
                        log.startsWith("$")
                          ? "text-[hsl(152,60%,55%)]"
                          : log.includes("✓") || log.includes("complete")
                          ? "text-[hsl(152,60%,55%)]"
                          : "text-[hsl(240,4%,55%)]"
                      }`}
                    >
                      {!log.startsWith("$") && (
                        <span className="text-[hsl(240,4%,30%)] mr-1.5">›</span>
                      )}
                      {log}
                    </p>
                  ))}
                  {isProving && (
                    <span className="inline-block w-1.5 h-3.5 bg-[hsl(240,4%,55%)] animate-pulse-soft" />
                  )}
                </div>
              </div>

              {/* Proof artifact (once proved) */}
              {isComplete && (
                <div className="rounded-xl border border-[hsl(152,60%,80%)] bg-[hsl(152,60%,97%)] p-4 space-y-3 transition-all duration-700">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-[hsl(152,60%,35%)]" />
                    <span className="text-sm font-semibold text-[hsl(152,60%,25%)]">
                      Proof Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <span className="text-muted-foreground">Proof Hash</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-foreground truncate">{PROOF_HASH}</span>
                      <button
                        onClick={copyProofHash}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-[hsl(152,60%,40%)]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <span className="text-muted-foreground">Algorithm</span>
                    <span className="font-mono text-foreground">debt-simplify {ALGO_VERSION}</span>
                    <span className="text-muted-foreground">Execution Time</span>
                    <span className="font-mono text-foreground">{(elapsedMs / 1000).toFixed(1)}s</span>
                    <span className="text-muted-foreground">Settlements</span>
                    <span className="font-mono text-foreground">{SETTLEMENTS.length} transfers</span>
                  </div>
                  <p className="text-[11px] text-[hsl(152,60%,30%)] italic pt-1 border-t border-[hsl(152,60%,85%)]">
                    This settlement was proven, not assumed.
                  </p>
                </div>
              )}

              {/* CTA */}
              {phase === "idle" && (
                <Button onClick={startProving} className="w-full h-11 rounded-xl">
                  <Cpu className="h-4 w-4 mr-2" />
                  Generate Proof
                </Button>
              )}
              {phase === "proved" && (
                <Button onClick={executeSettlement} className="w-full h-11 rounded-xl">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Execute via Smart Account
                </Button>
              )}
              {phase === "executing" && (
                <div className="w-full h-11 rounded-xl bg-muted flex items-center justify-center text-sm text-muted-foreground animate-pulse-soft">
                  Submitting UserOperation…
                </div>
              )}
              {phase === "settled" && (
                <Button onClick={onClose} variant="outline" className="w-full h-11 rounded-xl">
                  <Check className="h-4 w-4 mr-2 text-[hsl(152,60%,40%)]" />
                  Done
                </Button>
              )}
            </div>
          </div>

          {/* RIGHT: Output State */}
          <div className="p-5 space-y-4">
            <p className="section-label">Output State</p>

            <div className="space-y-2">
              {SETTLEMENTS.map((s, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 flex items-center gap-2.5 transition-all duration-500 ${
                    isComplete
                      ? "border-[hsl(152,60%,80%)] bg-[hsl(152,60%,97%)]"
                      : "border-border"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[hsl(0,72%,92%)] flex items-center justify-center text-[10px] font-bold text-[hsl(0,72%,45%)]">
                    {s.from[0]}
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="w-7 h-7 rounded-full bg-[hsl(152,60%,92%)] flex items-center justify-center text-[10px] font-bold text-[hsl(152,60%,30%)]">
                    {s.to[0]}
                  </div>
                  <span className="ml-auto text-sm font-semibold tabular">
                    ₹{s.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Transfers</span>
                <span className="font-medium">{SETTLEMENTS.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Proof Status</span>
                <span
                  className={`font-medium ${
                    isComplete
                      ? "text-[hsl(152,60%,35%)]"
                      : "text-muted-foreground"
                  }`}
                >
                  {isComplete ? "Verified ✓" : isProving ? "Proving…" : "Pending"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">AA Status</span>
                <span
                  className={`font-medium ${
                    phase === "settled"
                      ? "text-[hsl(152,60%,35%)]"
                      : "text-muted-foreground"
                  }`}
                >
                  {phase === "settled"
                    ? "Executed ✓"
                    : phase === "executing"
                    ? "Submitting…"
                    : isComplete
                    ? "Ready"
                    : "Waiting"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Gas</span>
                <span className="font-medium text-muted-foreground">Sponsored</span>
              </div>
            </div>

            {phase === "settled" && (
              <div className="rounded-xl border border-[hsl(152,60%,80%)] bg-[hsl(152,60%,94%)] p-4 text-center space-y-2 mt-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-[hsl(152,60%,45%)] flex items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm font-semibold text-[hsl(152,60%,25%)]">
                  Settlement Complete
                </p>
                <p className="text-[11px] text-[hsl(152,60%,35%)]">
                  All transfers verified and executed via smart account.
                </p>
              </div>
            )}

            {!isComplete && !isProving && (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Settlements will be verified once proof generation completes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
