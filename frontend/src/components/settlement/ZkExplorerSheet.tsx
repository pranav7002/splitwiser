import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, ShieldCheck, FileJson, Terminal } from "lucide-react";
import { useState } from "react";

interface ZkExplorerSheetProps {
  open: boolean;
  onClose: () => void;
  proofData: {
    jobId: string;
    completedAt: string;
    proofDetails?: {
      proof: string;
      imageId: string;
    };
  } | null;
}

export function ZkExplorerSheet({ open, onClose, proofData }: ZkExplorerSheetProps) {
  const [copiedProof, setCopiedProof] = useState(false);
  const [copiedImageId, setCopiedImageId] = useState(false);

  const proofHex = proofData?.proofDetails?.proof || "";
  const imageIdHex = proofData?.proofDetails?.imageId || "";

  const copyToClipboard = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleDownload = () => {
    if (!proofData?.proofDetails) return;
    const blob = new Blob([JSON.stringify(proofData.proofDetails, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zk-proof-${proofData.jobId.slice(-6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="h-6 w-6 text-[hsl(152,60%,45%)]" />
            ZK Proof Verification
          </SheetTitle>
        </SheetHeader>

        {!proofData?.proofDetails ? (
          <div className="flex flex-col items-center justify-center py-12 text-center h-full">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Proof Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              The cryptographic proof for this settlement could not be found. It may have been generated off-chain or before this feature was implemented.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="rounded-xl border border-[hsl(152,60%,80%)] bg-[hsl(152,60%,95%)] p-4">
              <p className="text-sm leading-relaxed text-[hsl(152,60%,30%)]">
                This settlement was executed trustlessly via a <strong>RISC Zero zkVM</strong>. 
                Below is the raw cryptographic receipt. You do not need to trust this platform; 
                you can verify the math yourself.
              </p>
            </div>

            {/* Cryptographic Artifacts */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">Circuit Image ID (Hash)</label>
                  <button
                    onClick={() => copyToClipboard(imageIdHex, setCopiedImageId)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copiedImageId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    {copiedImageId ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="rounded-lg bg-black p-3 overflow-x-auto border border-border">
                  <code className="text-xs text-green-400 break-all font-mono">
                    {imageIdHex}
                  </code>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  The SHA-256 hash identifying the exact binary code (the "Debt Simplification Algorithm") that executed securely.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">Raw Receipt (Proof Payload)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="h-7 text-xs flex items-center gap-1.5 px-2 text-[hsl(152,60%,45%)] hover:text-[hsl(152,60%,35%)] hover:bg-[hsl(152,60%,95%)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download JSON
                  </Button>
                </div>
                <div className="rounded-lg bg-black p-3 border border-border max-h-[120px] overflow-y-auto relative group mt-2">
                  <code className="text-[10px] text-green-400 break-all font-mono opacity-80 group-hover:opacity-100 transition-opacity">
                    {proofHex}
                  </code>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  The {Math.floor(proofHex.length / 2 / 1024)}KB STARK proof proving the execution was honest, validating the output matching the inputs.
                </p>
              </div>
            </div>

            {/* How to verify locally */}
            <div className="pt-6 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Independent Verification
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                To verify this proof trustlessly on your own machine without relying on our servers, install <a href="https://rustup.rs" className="text-primary hover:underline" target="_blank" rel="noreferrer">Rust</a>, clone the open-source repository, and run the verifier.
              </p>
              
              <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4">
                <div className="flex flex-col gap-2">
                  <code className="text-[11px] text-neutral-300 font-mono">
                    <span className="text-pink-500">git clone</span> https://github.com/pranav7002/splitwise-but-better
                  </code>
                  <code className="text-[11px] text-neutral-300 font-mono">
                    <span className="text-pink-500">cd</span> splitwise-but-better/risc0-settlement
                  </code>
                  <div className="my-1 border-t border-neutral-800" />
                  <code className="text-[11px] text-neutral-300 font-mono flex gap-2">
                    <span className="text-neutral-500 select-none"># Save the downloaded JSON</span>
                    <span><span className="text-pink-500">cp</span> ~/Downloads/zk-proof-*.json ./proof.json</span>
                  </code>
                  <code className="text-[11px] text-green-400 font-mono mt-1">
                    cargo run --bin verify -- --payload ./proof.json
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
