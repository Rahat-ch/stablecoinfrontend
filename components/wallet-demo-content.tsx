"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { StablecoinOperations } from "@/components/stablecoin-operations";
import { MFUSDStats } from "@/components/mfusd-stats";

export function WalletDemoContent() {
  const { disconnect, network } = useWallet();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const isTestnet = network?.chainId === 250;

  const handleTransactionSuccess = () => {
    // Trigger refresh of stats by updating the trigger value
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-foreground">mFUSD Stablecoin Interface</h1>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={disconnect}>
            Disconnect Wallet
          </Button>
          {!isTestnet && (
            <span className="text-sm text-orange-600 dark:text-orange-400">
              ⚠️ Please switch to Movement Testnet
            </span>
          )}
        </div>
      </div>

      <MFUSDStats refreshTrigger={refreshTrigger} />

      <StablecoinOperations onTransactionSuccess={handleTransactionSuccess} />
    </div>
  );
}