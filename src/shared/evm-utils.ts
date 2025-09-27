import { Account, Address, Chain, Transport } from "viem";
import { config, ChainConfig } from "./evm-config";
import { usdcABI } from "./usdc-abi";
import { ConnectedClient } from "../types/evm";

export function getUsdcChainConfigForChain(chainId: number): ChainConfig | undefined {
  return config[chainId.toString()];
}

let versionCache: string | null = null;

export async function getVersion<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined = undefined,
>(client: ConnectedClient<transport, chain, account>): Promise<string> {
  if (versionCache !== null) {
    return versionCache;
  }

  const chainConfig = getUsdcChainConfigForChain(client.chain!.id);
  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${client.chain!.id}`);
  }

  const version = await client.readContract({
    address: chainConfig.usdcAddress,
    abi: usdcABI,
    functionName: "version",
  });
  versionCache = version as string;
  return versionCache;
}

export async function getERC20Balance<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined = undefined,
>(
  client: ConnectedClient<transport, chain, account>,
  tokenAddress: Address,
  userAddress: Address,
): Promise<bigint> {
  const balance = await client.readContract({
    address: tokenAddress,
    abi: usdcABI,
    functionName: "balanceOf",
    args: [userAddress],
  });
  return balance as bigint;
}