import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiFetch } from "@/lib/api";

export interface User {
  _id: string;
  walletAddress: string;
  smartAccountAddress?: string;
}

interface SessionContextType {
  currentUser: User | null;
  isLoading: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/**
 * Resolves a wallet address to a backend User, creating one if it doesn't exist.
 */
async function resolveOrCreateUser(walletAddress: string): Promise<User> {
  // Try to find the user among existing users
  const listRes = await apiFetch<any>("/users");
  const users: User[] = listRes.data || [];

  const existing = users.find(
    (u) => u.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  if (existing) return existing;

  // Auto-register a new user
  const createRes = await apiFetch<any>("/users", {
    method: "POST",
    body: JSON.stringify({
      walletAddress,
    }),
  });

  return createRes.data as User;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Rehydrate session on mount from localStorage wallet address
  useEffect(() => {
    const savedAddr = localStorage.getItem("splitwiser_wallet");
    if (savedAddr) {
      resolveOrCreateUser(savedAddr)
        .then(setCurrentUser)
        .catch(() => localStorage.removeItem("splitwiser_wallet"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to continue.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts: string[] = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned from MetaMask.");
      }

      const walletAddress = accounts[0];
      const user = await resolveOrCreateUser(walletAddress);

      localStorage.setItem("splitwiser_wallet", walletAddress);
      setCurrentUser(user);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
      if (err?.code !== 4001) {
        // 4001 = user rejected — don't alert for that
        alert("Failed to connect wallet. Check console for details.");
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem("splitwiser_wallet");
    setCurrentUser(null);
  }, []);

  return (
    <SessionContext.Provider
      value={{ currentUser, isLoading, isConnecting, connectWallet, disconnectWallet }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
