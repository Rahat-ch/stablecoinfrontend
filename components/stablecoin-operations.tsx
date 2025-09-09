"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { toast } from "sonner";

const MFUSD_MODULE_ADDRESS = "0xf9656522a6359b1a81c55e625876d4bd7ecbca623422a9e3f103a84922820f76";
const MODULE_NAME = "mfusd";

interface StablecoinOperationsProps {
  onTransactionSuccess?: () => void;
}

export function StablecoinOperations({ onTransactionSuccess }: StablecoinOperationsProps) {
  const { account, signAndSubmitTransaction, network } = useWallet();
  
  // Form states
  const [depositCollateral, setDepositCollateral] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [addCollateralAmount, setAddCollateralAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if on testnet
  const isTestnet = network?.chainId === 250;

  // Create Aptos client for testnet
  const getAptosClient = () => {
    const config = new AptosConfig({ 
      network: Network.CUSTOM,
      fullnode: "https://full.testnet.movementinfra.xyz/v1",
    });
    return new Aptos(config);
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://explorer.movementnetwork.xyz/txn/${txHash}?network=bardock+testnet`;
  };

  // Helper to parse amount to octas (8 decimals)
  const parseAmount = (amount: string): string => {
    const parsedAmount = parseFloat(amount || "0");
    return Math.floor(parsedAmount * 100000000).toString();
  };

  // Format amount for display
  const formatAmount = (amount: string): string => {
    const parsedAmount = parseFloat(amount || "0");
    return parsedAmount.toFixed(2);
  };

  const handleTransaction = async (
    functionName: string,
    args: any[],
    description: string
  ) => {
    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isTestnet) {
      toast.error("Please switch to Movement Testnet");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading(`Processing ${description}...`);

    try {
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${MFUSD_MODULE_ADDRESS}::${MODULE_NAME}::${functionName}`,
          functionArguments: args,
        },
      });

      toast.loading("Transaction submitted. Waiting for confirmation...", {
        id: loadingToast,
      });

      const aptos = getAptosClient();
      await aptos.waitForTransaction({ transactionHash: response.hash });

      toast.success(
        <div className="flex flex-col gap-2">
          <p>{description} successful!</p>
          <a
            href={getExplorerUrl(response.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline hover:no-underline"
          >
            View on Explorer →
          </a>
        </div>,
        {
          id: loadingToast,
          duration: 10000,
        }
      );

      // Clear form fields after success
      setDepositCollateral("");
      setMintAmount("");
      setAddCollateralAmount("");

      // Trigger refresh of stats
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (err: any) {
      const errorMessage = err.message || `Failed to ${description.toLowerCase()}`;
      toast.error(errorMessage, {
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositAndMint = () => {
    if (!depositCollateral || !mintAmount) {
      toast.error("Please enter both collateral and mint amounts");
      return;
    }

    const collateralInOctas = parseAmount(depositCollateral);
    const mintInOctas = parseAmount(mintAmount);

    // Check minimum collateralization (150%)
    const minCollateral = parseFloat(mintAmount) * 1.51; // Slightly over 150%
    if (parseFloat(depositCollateral) < minCollateral) {
      toast.error(`Need at least ${minCollateral.toFixed(2)} MOVE collateral for ${mintAmount} mFUSD (>150% ratio)`);
      return;
    }

    handleTransaction(
      "deposit_and_mint",
      [collateralInOctas, mintInOctas],
      `Deposit ${formatAmount(depositCollateral)} MOVE and mint ${formatAmount(mintAmount)} mFUSD`
    );
  };

  const handleAddCollateral = () => {
    if (!addCollateralAmount) {
      toast.error("Please enter collateral amount");
      return;
    }

    const amountInOctas = parseAmount(addCollateralAmount);
    handleTransaction(
      "add_collateral",
      [amountInOctas],
      `Add ${formatAmount(addCollateralAmount)} MOVE collateral`
    );
  };


  if (!isTestnet) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="text-orange-600 dark:text-orange-400">Network Alert</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Please switch to Movement Testnet to use mFUSD stablecoin operations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">mFUSD Stablecoin Operations</h2>
        <p className="text-muted-foreground">
          Manage your collateralized stablecoin positions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deposit and Mint */}
        <Card>
          <CardHeader>
            <CardTitle>Deposit & Mint</CardTitle>
            <CardDescription>
              Deposit MOVE collateral and mint mFUSD in one transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Collateral Amount (MOVE)</label>
              <Input
                type="number"
                placeholder="e.g., 15.1"
                value={depositCollateral}
                onChange={(e) => setDepositCollateral(e.target.value)}
                disabled={isLoading}
                step="0.1"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Amount of MOVE to deposit as collateral
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mint Amount (mFUSD)</label>
              <Input
                type="number"
                placeholder="e.g., 10"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                disabled={isLoading}
                step="0.1"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Amount of mFUSD to mint (requires &gt;150% collateralization)
              </p>
            </div>
            <Button 
              onClick={handleDepositAndMint}
              disabled={isLoading || !account}
              className="w-full"
            >
              Deposit & Mint
            </Button>
          </CardContent>
        </Card>

        {/* Add Collateral */}
        <Card>
          <CardHeader>
            <CardTitle>Add Collateral</CardTitle>
            <CardDescription>
              Improve your collateralization ratio by adding more MOVE
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Collateral (MOVE)</label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={addCollateralAmount}
                onChange={(e) => setAddCollateralAmount(e.target.value)}
                disabled={isLoading}
                step="0.1"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Amount of MOVE to add to your position
              </p>
            </div>
            <Button 
              onClick={handleAddCollateral}
              disabled={isLoading || !account}
              className="w-full"
            >
              Add Collateral
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Minimum collateralization ratio: 150% (must deposit &gt;1.5x the mFUSD value)</p>
          <p>• All amounts use 8 decimal places (1 token = 100,000,000 units)</p>
          <p>• 1 MOVE is assumed to equal 1 USD for this demo</p>
          <p>• Positions below 150% can be liquidated by other users</p>
        </CardContent>
      </Card>
    </div>
  );
}