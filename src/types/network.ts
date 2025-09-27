import { z } from "zod";

export const NetworkSchema = z.enum([
  // Base
  "base-sepolia",
  "base",
  // Ethereum
  "ethereum",
  "sepolia",
  "goerli",
  // Arbitrum
  "arbitrum",
  "arbitrum-sepolia",
  "arbitrum-goerli",
  // Optimism
  "optimism",
  "optimism-sepolia",
  "optimism-goerli",
  // Polygon
  "polygon",
  "polygon-amoy",
  "polygon-mumbai",
  // BSC
  "bsc",
  "bsc-testnet",
  // Avalanche
  "avalanche-fuji",
  "avalanche",
  // IoTeX
  "iotex",
  // Sei
  "sei",
  "sei-testnet",
  // zkSync
  "zksync-era",
  "zksync-sepolia",
  // Linea
  "linea",
  "linea-sepolia",
  // Celo
  "celo",
  "celo-alfajores",
  // Gnosis
  "gnosis",
  "gnosis-chiado",
  // Fantom
  "fantom",
  "fantom-testnet",
  // Solana (SVM)
  "solana-devnet",
  "solana",
]);
export type Network = z.infer<typeof NetworkSchema>;

// evm
export const SupportedEVMNetworks: Network[] = [
  // Base
  "base-sepolia",
  "base",
  // Ethereum
  "ethereum",
  "sepolia",
  "goerli",
  // Arbitrum
  "arbitrum",
  "arbitrum-sepolia",
  "arbitrum-goerli",
  // Optimism
  "optimism",
  "optimism-sepolia",
  "optimism-goerli",
  // Polygon
  "polygon",
  "polygon-amoy",
  "polygon-mumbai",
  // BSC
  "bsc",
  "bsc-testnet",
  // Avalanche
  "avalanche-fuji",
  "avalanche",
  // IoTeX
  "iotex",
  // Sei
  "sei",
  "sei-testnet",
  // zkSync
  "zksync-era",
  "zksync-sepolia",
  // Linea
  "linea",
  "linea-sepolia",
  // Celo
  "celo",
  "celo-alfajores",
  // Gnosis
  "gnosis",
  "gnosis-chiado",
  // Fantom
  "fantom",
  "fantom-testnet",
];

export const EvmNetworkToChainId = new Map<Network, number>([
  // Base
  ["base-sepolia", 84532],
  ["base", 8453],
  // Ethereum
  ["ethereum", 1],
  ["sepolia", 11155111],
  ["goerli", 5],
  // Arbitrum
  ["arbitrum", 42161],
  ["arbitrum-sepolia", 421614],
  ["arbitrum-goerli", 421613],
  // Optimism
  ["optimism", 10],
  ["optimism-sepolia", 11155420],
  ["optimism-goerli", 420],
  // Polygon
  ["polygon", 137],
  ["polygon-amoy", 80002],
  ["polygon-mumbai", 80001],
  // BSC
  ["bsc", 56],
  ["bsc-testnet", 97],
  // Avalanche
  ["avalanche-fuji", 43113],
  ["avalanche", 43114],
  // IoTeX
  ["iotex", 4689],
  // Sei
  ["sei", 1329],
  ["sei-testnet", 1328],
  // zkSync
  ["zksync-era", 324],
  ["zksync-sepolia", 300],
  // Linea
  ["linea", 59144],
  ["linea-sepolia", 59141],
  // Celo
  ["celo", 42220],
  ["celo-alfajores", 44787],
  // Gnosis
  ["gnosis", 100],
  ["gnosis-chiado", 10200],
  // Fantom
  ["fantom", 250],
  ["fantom-testnet", 4002],
]);

// svm
export const SupportedSVMNetworks: Network[] = ["solana-devnet", "solana"];
export const SvmNetworkToChainId = new Map<Network, number>([
  ["solana-devnet", 103],
  ["solana", 101],
]);

export const ChainIdToNetwork = Object.fromEntries(
  [...SupportedEVMNetworks, ...SupportedSVMNetworks].map(network => {
    const chainId = EvmNetworkToChainId.get(network) || SvmNetworkToChainId.get(network);
    return chainId ? [chainId, network] : [];
  }).filter(([chainId]) => chainId !== undefined),
) as Record<number, Network>;
