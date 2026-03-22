import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddExpenseSheet } from "@/components/AddExpenseSheet";
import { MemberSidebar } from "@/components/group/MemberSidebar";
import { ExpenseFeed } from "@/components/group/ExpenseFeed";
import { SummaryPanel } from "@/components/group/SummaryPanel";
import { SettlementCinematic } from "@/components/settlement/SettlementCinematic";
import NotFound from "./NotFound";

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
  const [error, setError] = useState(false);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const [grpRes, balRes] = await Promise.all([
        apiFetch<any>(`/groups/${id}`),
        apiFetch<any>(`/groups/${id}/balances`)
      ]);
      setGroupData(grpRes.data);
      setBalanceData(balRes.data);
    } catch (err: any) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Auto-open cinematic if we discover a processing job on load
  useEffect(() => {
    if (balanceData?.activeJob && !showSettlement) {
      setShowSettlement(true);
    }
  }, [balanceData?.activeJob]);

  if (error) {
    return <NotFound />;
  }

  if (loading || !groupData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="w-32 h-4 rounded bg-muted animate-pulse" />
              <div className="w-20 h-2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid lg:grid-cols-[240px_1fr_320px] gap-8">
            <div className="hidden lg:block space-y-4">
              <div className="w-24 h-4 rounded bg-muted animate-pulse mb-6" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                  <div className="w-24 h-3 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
            <div className="space-y-4 mt-8 lg:mt-0">
              <div className="flex justify-between mb-8">
                <div className="w-24 h-4 rounded bg-muted animate-pulse" />
                <div className="w-16 h-4 rounded bg-muted animate-pulse" />
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="w-32 h-3 rounded bg-muted animate-pulse" />
                    <div className="w-20 h-2 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-card p-6 h-32 bg-muted/20 animate-pulse" />
              <div className="rounded-2xl border border-border bg-card p-6 h-48 bg-muted/20 animate-pulse" />
              <div className="w-full h-12 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            activeJob={balanceData?.activeJob}
            lastSettlement={balanceData?.lastSettlement}
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
        existingJobId={balanceData?.activeJob?.jobId}
      />
    </div>
  );
}
