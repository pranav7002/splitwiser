import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddExpenseSheet } from "@/components/AddExpenseSheet";
import { MemberSidebar } from "@/components/group/MemberSidebar";
import { ExpenseFeed } from "@/components/group/ExpenseFeed";
import { SummaryPanel } from "@/components/group/SummaryPanel";
import { SettlementCinematic } from "@/components/settlement/SettlementCinematic";

import { useSession } from "@/contexts/SessionContext";
import { apiFetch } from "@/lib/api";

export default function GroupDetailPage() {
  const { id } = useParams();
  const { currentUser } = useSession();
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  
  const [groupData, setGroupData] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const [grpRes, balRes] = await Promise.all([
        apiFetch<any>(`/groups/${id}`),
        apiFetch<any>(`/groups/${id}/balances`)
      ]);
      setGroupData(grpRes.data);
      setBalanceData(balRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading || !groupData) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading Vault...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold">{groupData.group.name}</h1>
              <p className="text-[11px] text-muted-foreground">Vault ID: {groupData.group.groupId.slice(0,8)}…</p>
            </div>
          </div>
          <span className="text-xs font-medium text-primary">Active Vault</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[200px_1fr_320px] gap-8">
          <MemberSidebar members={groupData.members} groupId={id} />
          <ExpenseFeed expenses={groupData.expenses} members={groupData.members} />
          <SummaryPanel
            totals={balanceData?.totals}
            myBalance={balanceData?.balances?.find((b: any) => b.walletAddress.toLowerCase() === currentUser?.walletAddress.toLowerCase())?.balance || "0"}
            isSettled={isSettled}
            onSettle={() => setShowSettlement(true)}
          />
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setShowAddExpense(true)}
          size="lg"
          className="rounded-full shadow-lg hover:shadow-xl px-6 h-12"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <AddExpenseSheet 
        open={showAddExpense} 
        onClose={() => setShowAddExpense(false)} 
        groupId={id}
        members={groupData.members}
        onAdded={fetchDetails}
      />

      <SettlementCinematic
        open={showSettlement}
        onClose={() => setShowSettlement(false)}
        onSettled={() => { setIsSettled(true); fetchDetails(); }}
        groupId={id}
        balances={balanceData?.balances || []}
        members={groupData.members}
      />
    </div>
  );
}
