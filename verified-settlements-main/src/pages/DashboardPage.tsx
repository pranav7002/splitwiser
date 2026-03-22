import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Receipt, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CreateGroupModal } from "@/components/CreateGroupModal";

const MEMBER_COLORS = [
  "bg-[hsl(239,84%,67%)] text-white",
  "bg-[hsl(38,92%,60%)] text-white",
  "bg-[hsl(0,72%,60%)] text-white",
  "bg-[hsl(152,60%,45%)] text-white",
  "bg-[hsl(280,60%,60%)] text-white",
];

interface Group {
  id: string;
  name: string;
  description: string;
  members: { name: string; initial: string }[];
  vaultBalance: string;
  status: "active" | "ready" | "settled";
}

const DEMO_GROUPS: Group[] = [
  {
     id: "1",
    name: "Dinner at Taj Hotel",
    description: "Group dinner — March 22",
    members: [
      { name: "Tanishka", initial: "T" },
      { name: "Pranav", initial: "P" },
      { name: "Mihir", initial: "M" },
    ],
    vaultBalance: "₹9,000",
    status: "active",
  },
  
];

const statusDot: Record<string, string> = {
  active: "bg-[hsl(152,60%,45%)]",
  ready: "bg-[hsl(38,92%,50%)]",
  settled: "bg-[hsl(240,4%,70%)]",
};

export default function DashboardPage() {
  const [groups, setGroups] = useState<Group[]>(DEMO_GROUPS);
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (name: string, description: string) => {
    setGroups((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name,
        description,
        members: [],
        vaultBalance: "$0.00",
        status: "active",
      },
    ]);
  };

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
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-xs font-medium">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
              A
            </div>
            <span className="text-muted-foreground">1.24 ETH</span>
            <span className="text-foreground">0x1a2b…3c4d</span>
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

        {groups.length === 0 ? (
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
              <ScrollReveal key={group.id} delay={(i + 1) * 80}>
                <Link to={`/group/${group.id}`} className="block h-full">
                  <div className="relative h-full rounded-2xl border border-border bg-card p-6 hover:border-primary/20 hover:shadow-md transition-all duration-300 group active:scale-[0.98]">
                    {/* Status dot */}
                    <div className={`absolute top-5 right-5 w-2.5 h-2.5 rounded-full ${statusDot[group.status]}`} />

                    <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      {group.description}
                    </p>

                    {/* Member avatars */}
                    <div className="flex items-center -space-x-2 mb-6">
                      {group.members.map((m, mi) => (
                        <div
                          key={m.name}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-card ${MEMBER_COLORS[mi % MEMBER_COLORS.length]}`}
                        >
                          {m.initial}
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
                          {group.vaultBalance}
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
