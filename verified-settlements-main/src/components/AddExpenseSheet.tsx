import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
}

const MEMBERS = ["Tanishka", "Pranav", "Mihir"];

export function AddExpenseSheet({ open, onClose }: AddExpenseSheetProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payer, setPayer] = useState("You");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");

  const perPerson = amount ? (parseFloat(amount) / MEMBERS.length).toFixed(2) : "0.00";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    setAmount("");
    setDescription("");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Expense</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div>
            <label className="section-label mb-1.5 block">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 text-lg font-semibold tabular"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="section-label mb-1.5 block">Description</label>
            <Input
              placeholder="What was this for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
  <label className="section-label mb-1.5 block">Receipt (optional)</label>
  <div
    className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all duration-200"
    onClick={() => document.getElementById('receipt-upload')?.click()}
  >
    <div className="text-2xl mb-2">📎</div>
    <p className="text-sm font-medium text-foreground">Drop receipt here</p>
    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
    <input
      id="receipt-upload"
      type="file"
      accept="image/*,.pdf"
      className="hidden"
    />
  </div>
</div>


          <div>
            <label className="section-label mb-1.5 block">Paid by</label>
            <div className="flex flex-wrap gap-1.5">
              {MEMBERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayer(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-[0.96] ${
                    payer === m
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="section-label mb-1.5 block">Split</label>
            <div className="flex gap-1.5 mb-3">
              {(["equal", "custom"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 active:scale-[0.96] capitalize ${
                    splitMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            {splitMode === "equal" && amount && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-2">Each person pays</div>
               <div className="text-lg font-semibold tabular">₹{perPerson}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Split equally among {MEMBERS.length} members
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!amount || !description}>
              Add Expense
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
