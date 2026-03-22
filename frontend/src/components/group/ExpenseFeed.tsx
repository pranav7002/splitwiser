import { ScrollReveal } from "@/components/ScrollReveal";
import { UtensilsCrossed, Car, Building2, ShoppingBag, Plane, Coffee, Receipt, Ghost } from "lucide-react";

// Helper to determine icon based on description
const getCategoryIcon = (desc: string) => {
  const d = desc.toLowerCase();
  if (d.match(/food|dinner|lunch|breakfast|eat|restaurant|pizza|burger/)) {
    return { icon: UtensilsCrossed, bg: "bg-[hsl(0,72%,95%)]", color: "text-[hsl(0,72%,50%)]" };
  }
  if (d.match(/uber|lyft|taxi|cab|car|drive|gas|toll|parking/)) {
    return { icon: Car, bg: "bg-[hsl(239,84%,95%)]", color: "text-[hsl(239,84%,55%)]" };
  }
  if (d.match(/hotel|airbnb|rent|house|apartment|stay/)) {
    return { icon: Building2, bg: "bg-[hsl(152,60%,94%)]", color: "text-[hsl(152,60%,35%)]" };
  }
  if (d.match(/flight|plane|air|ticket|trip/)) {
    return { icon: Plane, bg: "bg-[hsl(190,90%,92%)]", color: "text-[hsl(190,90%,40%)]" };
  }
  if (d.match(/coffee|tea|cafe|starbucks/)) {
    return { icon: Coffee, bg: "bg-[hsl(30,80%,92%)]", color: "text-[hsl(30,80%,40%)]" };
  }
  if (d.match(/shop|buy|store|groceries|market/)) {
    return { icon: ShoppingBag, bg: "bg-[hsl(38,92%,94%)]", color: "text-[hsl(38,72%,45%)]" };
  }
  return { icon: Receipt, bg: "bg-muted", color: "text-muted-foreground" };
};

export function ExpenseFeed({ expenses, members }: { expenses?: any[], members?: any[] }) {
  if (!expenses || !members) return null;

  const getUserName = (id: string) => {
    const user = members.find(m => m.userId === id);
    if (!user?.walletAddress) return id.slice(0, 8);
    return `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`;
  };

  return (
    <div>
      <ScrollReveal>
        <div className="flex items-baseline justify-between mb-4">
          <p className="section-label">Activity Log</p>
          <span className="text-xs text-muted-foreground">{expenses.length} expenses</span>
        </div>
      </ScrollReveal>
      
      <div className="space-y-3 mt-4">
        {expenses.length === 0 && (
          <ScrollReveal delay={100}>
            <div className="rounded-2xl border border-dashed border-border p-10 flex flex-col items-center justify-center text-center bg-card/50">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4 text-muted-foreground/30">
                <Ghost className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-medium mb-1">It's quiet in here</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                No expenses have been added to this vault yet. 
              </p>
            </div>
          </ScrollReveal>
        )}

        {expenses.map((expense, i) => {
          const cat = getCategoryIcon(expense.description || "");
          const Icon = cat.icon;
          return (
            <ScrollReveal key={expense.expenseId} delay={i * 60}>
              <div className="rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/15 transition-all duration-200 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4.5 w-4.5 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{expense.description || "Expense"}</div>
                  <div className="text-xs text-muted-foreground">
                    Paid by {getUserName(expense.paidBy)}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular">
                 ₹{expense.amount.toLocaleString('en-IN')}
                </div>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
