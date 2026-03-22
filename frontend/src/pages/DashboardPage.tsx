import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Receipt, ChevronRight, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CreateGroupModal } from "@/components/CreateGroupModal";

import { useSession } from "@/contexts/SessionContext";
import { apiFetch } from "@/lib/api";

const MEMBER_COLORS = [
  "bg-[hsl(239,84%,67%)] text-white",
  "bg-[hsl(38,92%,60%)] text-white",
  "bg-[hsl(0,72%,60%)] text-white",
  "bg-[hsl(152,60%,45%)] text-white",
  "bg-[hsl(280,60%,60%)] text-white",
];

function ConnectWalletScreen() {
  const { connectWallet, isConnecting } = useSession();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Wallet className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Connect Wallet</h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Connect your MetaMask wallet to start managing shared expenses with
          cryptographic settlements.
        </p>
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          size="lg"
          className="w-full rounded-xl h-12 text-sm font-semibold"
        >
          {isConnecting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Connecting…
            </span>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Connect MetaMask
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground mt-4">
          Make sure MetaMask is installed and unlocked.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, disconnectWallet } = useSession();
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    if (!currentUser) return;
    try {
      const res = await apiFetch<any>('/groups');
      const allGroups = res.data?.groups || [];
      const myGroups = allGroups.filter((g: any) => 
        (g.members || []).some((m: any) => m.userId === currentUser._id)
      );
      setGroups(myGroups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser]);

  const handleCreate = async (name: string, memberAddresses: string[]) => {
    if (!currentUser) return;
    try {
      await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify({
          name,
          memberAddresses,
          createdBy: currentUser.walletAddress
        })
      });
      fetchGroups();
    } catch (err) {
      console.error(err);
    }
  };

  if (!currentUser) {
    return <ConnectWalletScreen />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">S</span>
            </div>
            <span className="font-semibold text-sm">SplitWiser</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-xs font-medium">
              <div className="w-2 h-2 rounded-full bg-[hsl(152,60%,45%)]" />
              <span className="text-foreground font-mono">
                {currentUser.walletAddress.slice(0,6)}…{currentUser.walletAddress.slice(-4)}
              </span>
            </div>
            <button
              onClick={disconnectWallet}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Disconnect wallet"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <ScrollReveal>
          <div className="mb-10">
            <h1 className="text-2xl font-semibold mb-1.5">Your Vaults</h1>
            <p className="text-sm text-muted-foreground">
              Manage your expense groups and settlements
            </p>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0,1,2].map(i => (
              <div key={i} className="h-[220px] rounded-2xl border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Create tile */}
            <ScrollReveal delay={0}>
              <button
                onClick={() => setShowCreate(true)}
                className="w-full h-full min-h-[220px] rounded-2xl border-2 border-dashed border-border hover:border-primary/30 bg-[hsl(var(--muted)/0.3)] flex flex-col items-center justify-center gap-4 transition-all duration-300 hover:shadow-sm group active:scale-[0.98]"
              >
                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary/40 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground mb-0.5">
                    Initialize New Vault
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Create a shared expense group
                  </div>
                </div>
              </button>
            </ScrollReveal>

            {groups.map((group, i) => (
              <ScrollReveal key={group.groupId || i} delay={(i + 1) * 80}>
                <Link to={`/group/${group.groupId}`} className="block h-full">
                  <div className="relative h-full rounded-2xl border border-border bg-card p-6 hover:border-primary/20 hover:shadow-md transition-all duration-300 group active:scale-[0.98]">
                    <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      {group.memberCount} members · {group.expenseCount || 0} expenses
                    </p>

                    {/* Member avatars */}
                    <div className="flex items-center -space-x-2 mb-6">
                      {group.members.slice(0,3).map((m: any, mi: number) => (
                        <div
                          key={m.userId || mi}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-card ${MEMBER_COLORS[mi % MEMBER_COLORS.length]}`}
                        >
                          {m.walletAddress?.slice(2, 4)?.toUpperCase() || "??"}
                        </div>
                      ))}
                      {group.members.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                          +{group.members.length - 3}
                        </div>
                      )}
                    </div>

                    {/* Vault balance */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                          Vault Balance
                        </div>
                        <div className="text-2xl font-semibold tabular">
                          ₹{(group.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all mb-1" />
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </main>

      <CreateGroupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <ScrollReveal>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Start your first vault</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Create a vault to begin tracking shared expenses and settle up with
          verified proofs.
        </p>
        <Button onClick={onCreate} variant="hero" size="lg">
          <Plus className="h-4 w-4 mr-1" />
          Initialize Vault
        </Button>
      </div>
    </ScrollReveal>
  );
}
