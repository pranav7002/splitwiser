import { ScrollReveal } from "@/components/ScrollReveal";
import { UtensilsCrossed, Car, Building2, ShoppingBag } from "lucide-react";

const CATEGORY_ICONS = [
  { icon: UtensilsCrossed, bg: "bg-[hsl(0,72%,95%)]", color: "text-[hsl(0,72%,50%)]" },
  { icon: Car, bg: "bg-[hsl(239,84%,95%)]", color: "text-[hsl(239,84%,55%)]" },
  { icon: Building2, bg: "bg-[hsl(152,60%,94%)]", color: "text-[hsl(152,60%,35%)]" },
  { icon: ShoppingBag, bg: "bg-[hsl(38,92%,94%)]", color: "text-[hsl(38,72%,45%)]" },
];

const EXPENSES = [
  { id: "1", payer: "Tanishka", amount: 6000, description: "Dinner — Taj Hotel",  category: 0 },
  { id: "2", payer: "Pranav",   amount: 1800, description: "Drinks and desserts", category: 3 },
  { id: "3", payer: "Mihir",    amount: 1200, description: "Cab cost",            category: 1 },
];

export function ExpenseFeed() {
  return (
    <div>
      <ScrollReveal>
        <div className="flex items-baseline justify-between mb-4">
          <p className="section-label">Activity Log</p>
          <span className="text-xs text-muted-foreground">{EXPENSES.length} expenses</span>
        </div>
      </ScrollReveal>
      <div className="space-y-2">
        {EXPENSES.map((expense, i) => {
          const cat = CATEGORY_ICONS[expense.category];
          const Icon = cat.icon;
          return (
            <ScrollReveal key={expense.id} delay={i * 60}>
              <div className="rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/15 transition-all duration-200 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4.5 w-4.5 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{expense.description}</div>
                  <div className="text-xs text-muted-foreground">
                    Paid by {expense.payer}
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
