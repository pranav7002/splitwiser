import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/contexts/SessionContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  members: any[];
  onAdded: () => Promise<void>;
}

export function AddExpenseSheet({ open, onClose, groupId, members, onAdded }: AddExpenseSheetProps) {
  const { currentUser } = useSession();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payer, setPayer] = useState("");
  const [loading, setLoading] = useState(false);

  // Set default payer when sheet opens or currentUser changes
  useEffect(() => {
    if (open && currentUser && !payer) {
      setPayer(currentUser._id);
    }
  }, [open, currentUser]);

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      setAmount("");
      setDescription("");
      setPayer("");
    }
  }, [open]);

  const perPerson = amount && members?.length ? (parseFloat(amount) / members.length).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !groupId || !payer) return;
    
    setLoading(true);
    try {
      const totalAmt = parseFloat(amount);
      const splitAmt = totalAmt / members.length;
      const splits = members.map(m => ({ user: m.userId, amount: splitAmt }));

      await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          paidBy: payer,
          amount: totalAmt,
          description,
          splits
        })
      });
      toast.success("Expense added successfully");
      await onAdded();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (m: any) => {
    if (m.userId === currentUser?._id) return "You";
    if (!m.walletAddress) return "Unknown";
    return `${m.walletAddress.slice(0, 6)}…${m.walletAddress.slice(-4)}`;
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
            <label className="section-label mb-1.5 block">Paid by</label>
            <div className="flex flex-wrap gap-2">
              {members?.map((m) => {
                const isSelected = payer === m.userId;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => setPayer(m.userId)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {getDisplayName(m)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="section-label mb-1.5 block">Split</label>
            <p className="text-xs text-muted-foreground mb-3">Split equally among all members</p>
            {amount && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground mb-2">Each person pays</div>
                <div className="text-lg font-semibold tabular">₹{perPerson}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Split equally among {members?.length || 0} members
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-border flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !amount}>
              {loading ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
