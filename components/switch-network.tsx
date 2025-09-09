"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";

export function SwitchNetwork() {
  const { network, wallet } = useWallet();
  
  // Determine current network type - use chain IDs as primary detection
  const isMovementTestnet = network?.chainId === 250;
  const isNightly = wallet?.name?.toLowerCase().includes("nightly");

  
  
  const handleSwitchToTestnet = async () => {
    const networkName = "Movement Testnet";
    const loadingToast = toast.loading(`Switching to ${networkName}...`);

    try {
      // Movement Testnet chain ID
      const chainId = 250;
      
      // Check if we're using Nightly wallet
      if (isNightly && typeof window !== "undefined") {
        // Use Nightly's direct API
        if ((window as any).nightly?.aptos?.changeNetwork) {
          await (window as any).nightly.aptos.changeNetwork({
            chainId,
            name: "custom"
          });
          
          // Give some time for the network state to update
          setTimeout(() => {
            toast.success(`Switched to ${networkName}`, {
              id: loadingToast,
            });
          }, 1000);
          return;
        }
      }
      
      // No fallback - only Nightly supports Movement network switching
      toast.error("Network switching not supported. Please use Nightly wallet for network switching.", {
        id: loadingToast,
      });
    } catch (err: any) {
      const errorMessage = err.message || `Failed to switch to ${networkName}`;
      toast.error(errorMessage, {
        id: loadingToast,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <p className="text-muted-foreground">Current Network:</p>
          <p className="font-medium">
            {isMovementTestnet ? "Movement Testnet (Chain ID: 250)" : `${network?.name || "Unknown"} (Chain ID: ${network?.chainId})`}
          </p>
          {!isMovementTestnet && (
            <p className="text-xs text-orange-500 mt-1">
              Please switch to Movement Testnet to use this dApp
            </p>
          )}
        </div>
        
        {!isMovementTestnet && (
          isNightly ? (
            <Button
              variant="outline"
              onClick={handleSwitchToTestnet}
              className="w-full"
            >
              Switch to Movement Testnet
            </Button>
          ) : (
            <div className="text-center space-y-2 py-4">
              <p className="text-sm text-muted-foreground">
                Please manually switch to Movement Testnet in your wallet:
              </p>
              <div className="text-xs">
                <p><strong>Movement Testnet:</strong> Chain ID 250</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Automatic network switching is only available with Nightly wallet
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}