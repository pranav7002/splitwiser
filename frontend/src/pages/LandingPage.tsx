import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, RefreshCw, ShieldCheck, Users, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useSession } from "@/contexts/SessionContext";


export default function LandingPage() {
  const { currentUser, connectWallet, isConnecting } = useSession();
  const navigate = useNavigate();

  // Reactive navigation: as soon as we have a user, go to dashboard
  useEffect(() => {
    if (currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, navigate]);

  const handleLaunch = async () => {
    if (currentUser) {
      navigate("/dashboard");
    } else {
      await connectWallet();
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">S</span>
            </div>
            <span className="font-semibold text-foreground text-sm">SplitWiser</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">About</a>
            <Button size="sm" className="rounded-full px-5" onClick={handleLaunch} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Launch App"}
              {!isConnecting && <ArrowRight className="ml-1 h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.08] mb-6 opacity-0 animate-fade-up"
            style={{ animationDelay: "0ms", lineHeight: "1.1" }}
          >
            Finance for Friends,
            <br />
            <span className="relative inline-block">
              Settled by Code
              <span className="absolute bottom-0.5 left-0 right-0 h-[3px] bg-foreground rounded-full" />
            </span>
          </h1>
          <p
            className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed opacity-0 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            SplitWiser is the trustless way to manage shared expenses. Lock funds, scan bills, and settle instantly using smart contracts.
          </p>
          <div
            className="flex items-center justify-center gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "200ms" }}
          >
            <Button 
              variant="default" 
              size="lg" 
              className="rounded-full px-8 h-12 text-sm font-semibold group"
              onClick={handleLaunch}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Launch Dashboard
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <ScrollReveal className="px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-[hsl(0,72%,60%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(38,92%,60%)]" />
              <div className="w-3 h-3 rounded-full bg-[hsl(152,60%,50%)]" />
            </div>
            <div className="p-6 grid md:grid-cols-[180px_1fr] gap-6">
              {/* Mini sidebar */}
              <div className="hidden md:block space-y-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Groups</p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="text-sm font-semibold">Dinner at Taj Hotel</div>
                  <div className="text-[11px] text-muted-foreground">3 members</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-sm font-medium">Office Lunch</div>
                  <div className="text-[11px] text-muted-foreground">4 members</div>
                </div>
              </div>
              {/* Mini main */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-base font-semibold">Dinner at Taj Hotel</div>
                    <div className="text-xs text-muted-foreground">Active vault</div>
                  </div>
                  <span className="text-xs font-medium text-[hsl(152,60%,35%)] bg-[hsl(152,60%,94%)] px-2 py-0.5 rounded-full">Active</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-[11px] text-muted-foreground mb-0.5">Vault Balance</div>
                    <div className="text-lg font-semibold tabular">₹9,000</div>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-[11px] text-muted-foreground mb-0.5">Your Position</div>
                    <div className="text-lg font-semibold tabular text-[hsl(152,60%,35%)]">+₹1,400</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">Recent Activity</p>
                <div className="rounded-lg border border-border p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[hsl(0,72%,95%)] flex items-center justify-center">
                    <div className="w-3 h-3 rounded-sm bg-[hsl(0,72%,60%)]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Dinner — Taj Hotel</div>
                    <div className="text-[11px] text-muted-foreground">Paid by Tanishka</div>
                  </div>
                  <span className="text-sm font-semibold tabular">₹6,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Features section */}
      <section id="features" className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal className="text-center mb-14">
            <h2 className="text-2xl font-semibold mb-2">Why SplitWiser?</h2>
            <p className="text-sm text-muted-foreground">Built for transparency. Designed for trust.</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScrollReveal className="md:col-span-2">
              <div className="h-full rounded-3xl border border-border bg-card p-10 flex flex-col items-center text-center justify-center min-h-[320px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <Lock className="h-9 w-9 text-muted-foreground" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-3">The Vault</p>
                <h3 className="text-3xl font-bold mb-4 tracking-tight">No IOUs. Funds are locked in escrow.</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  Before the trip even starts, everyone's contribution is safely locked in a smart contract. No more chasing payments.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={160}>
              <div className="h-full rounded-3xl border border-border bg-card p-8 flex flex-col items-center text-center justify-center min-h-[320px] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <RefreshCw className="h-7 w-7 text-primary" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-2">Instant Refund</p>
                <h3 className="text-xl font-bold mb-3">One-Click Settle</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When the trip ends, settle all debts with a single transaction.
                </p>
              </div>
            </ScrollReveal>

            {[
              { icon: ShieldCheck, title: "ZK Verification", desc: "Settlements verified by zero-knowledge proofs" },
              { icon: Users, title: "Group Splitting", desc: "Invite friends via wallet address" },
              { icon: Zap, title: "Smart Accounts", desc: "Gasless settlements via account abstraction" },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 80 + 200}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 flex flex-col items-center text-center gap-4 transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.01] hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1.5">{item.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed text-balance">{item.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-[10px] font-bold">S</span>
            </div>
            <span>SplitWiser © 2026</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
            <a href="#" className="hover:text-foreground transition-colors">About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}