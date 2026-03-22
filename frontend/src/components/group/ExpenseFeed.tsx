import { ScrollReveal } from "@/components/ScrollReveal";
import { UtensilsCrossed, Car, Building2, ShoppingBag } from "lucide-react";

const CATEGORY_ICONS = [
  { icon: UtensilsCrossed, bg: "bg-[hsl(0,72%,95%)]", color: "text-[hsl(0,72%,50%)]" },
  { icon: Car, bg: "bg-[hsl(239,84%,95%)]", color: "text-[hsl(239,84%,55%)]" },
  { icon: Building2, bg: "bg-[hsl(152,60%,94%)]", color: "text-[hsl(152,60%,35%)]" },
  { icon: ShoppingBag, bg: "bg-[hsl(38,92%,94%)]", color: "text-[hsl(38,72%,45%)]" },
];

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
      <div className="space-y-2">
        {expenses.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No expenses yet.</p>}
        {expenses.map((expense, i) => {
          const cat = CATEGORY_ICONS[i % CATEGORY_ICONS.length];
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
