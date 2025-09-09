"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const MFUSD_MODULE_ADDRESS = "0xf9656522a6359b1a81c55e625876d4bd7ecbca623422a9e3f103a84922820f76";
const MODULE_NAME = "mfusd";

interface PositionData {
  collateral: number;
  minted: number;
  ratio: number;
}

interface ProtocolStats {
  totalCollateral: number;
  totalMinted: number;
}

export function MFUSDStats({ refreshTrigger }: { refreshTrigger?: number }) {
  const { account, network } = useWallet();
  const [position, setPosition] = useState<PositionData | null>(null);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(false);

  const isTestnet = network?.chainId === 250;

  // Create Aptos client for testnet
  const getAptosClient = () => {
    const config = new AptosConfig({ 
      network: Network.CUSTOM,
      fullnode: "https://full.testnet.movementinfra.xyz/v1",
    });
    return new Aptos(config);
  };

  // Format amount from octas to decimal
  const formatAmount = (amount: string | number): string => {
    const value = typeof amount === 'string' ? parseInt(amount) : amount;
    return (value / 100000000).toFixed(2);
  };

  // Calculate health status
  const getHealthStatus = (ratio: number) => {
    if (ratio === 0) return { status: "No Position", color: "text-muted-foreground" };
    if (ratio >= 200) return { status: "Very Healthy", color: "text-green-600 dark:text-green-400" };
    if (ratio >= 170) return { status: "Healthy", color: "text-blue-600 dark:text-blue-400" };
    if (ratio >= 150) return { status: "At Risk", color: "text-yellow-600 dark:text-yellow-400" };
    return { status: "Liquidatable", color: "text-red-600 dark:text-red-400" };
  };

  const fetchData = React.useCallback(async () => {
    if (!account || !isTestnet) return;

    setLoading(true);
    try {
      const aptos = getAptosClient();

      // Fetch user position
      try {
        const positionResult = await aptos.view({
          payload: {
            function: `${MFUSD_MODULE_ADDRESS}::${MODULE_NAME}::get_position`,
            functionArguments: [account.address],
          },
        });

        const collateral = parseInt(positionResult[0] as string);
        const minted = parseInt(positionResult[1] as string);

        // Fetch collateralization ratio
        let ratio = 0;
        if (minted > 0) {
          const ratioResult = await aptos.view({
            payload: {
              function: `${MFUSD_MODULE_ADDRESS}::${MODULE_NAME}::get_collateralization_ratio`,
              functionArguments: [account.address],
            },
          });
          ratio = parseInt(ratioResult[0] as string) / 100; // Convert basis points to percentage
        }

        setPosition({
          collateral: collateral,
          minted: minted,
          ratio: ratio,
        });
      } catch (error) {
        // User has no position
        setPosition(null);
      }

      // Fetch protocol stats
      try {
        const statsResult = await aptos.view({
          payload: {
            function: `${MFUSD_MODULE_ADDRESS}::${MODULE_NAME}::get_protocol_stats`,
            functionArguments: [],
          },
        });

        setProtocolStats({
          totalCollateral: parseInt(statsResult[0] as string),
          totalMinted: parseInt(statsResult[1] as string),
        });
      } catch (statsError) {
        console.error("Error fetching protocol stats:", statsError);
      }
    } catch (fetchError) {
      console.error("Error fetching data:", fetchError);
    } finally {
      setLoading(false);
    }
  }, [account, isTestnet]);

  useEffect(() => {
    if (account && isTestnet) {
      fetchData();
    }
  }, [account, isTestnet, refreshTrigger, fetchData]);

  if (!isTestnet) {
    return null;
  }

  const healthStatus = position ? getHealthStatus(position.ratio) : null;

  return (
    <div className="grid gap-6 md:grid-cols-2 mb-8">
      {/* User Position */}
      <Card>
        <CardHeader>
          <CardTitle>Your Position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : position && (position.collateral > 0 || position.minted > 0) ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Collateral Locked</p>
                  <p className="text-lg font-semibold">{formatAmount(position.collateral)} MOVE</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">mFUSD Minted</p>
                  <p className="text-lg font-semibold">{formatAmount(position.minted)} mFUSD</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Collateralization Ratio</p>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-semibold ${healthStatus?.color}`}>
                    {position.ratio.toFixed(0)}%
                  </p>
                  <span className={`text-sm ${healthStatus?.color}`}>
                    ({healthStatus?.status})
                  </span>
                </div>
                {position.ratio < 170 && position.ratio > 0 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    ⚠️ Consider adding collateral to improve your ratio
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No active position</p>
              <p className="text-xs text-muted-foreground mt-1">
                Deposit collateral and mint mFUSD to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocol Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Protocol Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : protocolStats ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Collateral</p>
                  <p className="text-lg font-semibold">{formatAmount(protocolStats.totalCollateral)} MOVE</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total mFUSD Supply</p>
                  <p className="text-lg font-semibold">{formatAmount(protocolStats.totalMinted)} mFUSD</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Global Collateralization</p>
                <p className="text-lg font-semibold">
                  {protocolStats.totalMinted > 0 
                    ? ((protocolStats.totalCollateral / protocolStats.totalMinted) * 100).toFixed(0)
                    : "∞"}%
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Min. Required Ratio: 150% • Price: 1 MOVE = 1 USD (fixed)
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Unable to fetch protocol statistics
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}