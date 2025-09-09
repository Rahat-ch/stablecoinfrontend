"use client";

import { ReactNode } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Movement Testnet configuration
  // The wallet adapter will handle network configuration based on wallet connection
  
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      onError={(error) => {
        console.error("Wallet error:", JSON.stringify(error, null, 2));
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}