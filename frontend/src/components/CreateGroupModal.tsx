import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/contexts/SessionContext";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, memberAddresses: string[]) => void;
}

const ETH_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function CreateGroupModal({ open, onClose, onCreate }: CreateGroupModalProps) {
  const { currentUser } = useSession();
  const [name, setName] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [invitedAddresses, setInvitedAddresses] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setName("");
    setAddressInput("");
    setInvitedAddresses([]);
  }, []);

  const addAddress = () => {
    const addr = addressInput.trim().toLowerCase();

    if (!ETH_REGEX.test(addr)) {
      toast.error("Invalid Ethereum address. Must be 0x followed by 40 hex characters.");
      return;
    }

    if (addr === currentUser?.walletAddress?.toLowerCase()) {
      toast.error("You're already included in the group.");
      return;
    }

    if (invitedAddresses.includes(addr)) {
      toast.error("This address is already added.");
      return;
    }

    setInvitedAddresses((prev) => [...prev, addr]);
    setAddressInput("");
  };

  const removeAddress = (addr: string) => {
    setInvitedAddresses((prev) => prev.filter((a) => a !== addr));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addAddress();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), invitedAddresses);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Create Group</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="section-label mb-1.5 block">Group Name</label>
            <Input
              placeholder="e.g. Europe Trip 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="section-label mb-1.5 block">Invite Members</label>
            <div className="flex gap-2">
              <Input
                placeholder="0x... wallet address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="font-mono text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addAddress} className="shrink-0 px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Invited list */}
            {invitedAddresses.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {invitedAddresses.map((addr) => (
                  <div
                    key={addr}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border"
                  >
                    <span className="text-xs font-mono text-foreground truncate">
                      {addr.slice(0, 6)}…{addr.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAddress(addr)}
                      className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* You indicator */}
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-mono text-primary">
                {currentUser?.walletAddress?.slice(0, 6)}…{currentUser?.walletAddress?.slice(-4)}
              </span>
              <span className="text-[10px] text-primary/60 ml-auto">You (auto-included)</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Group
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
