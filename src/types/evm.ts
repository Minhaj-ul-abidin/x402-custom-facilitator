import { createPublicClient, createWalletClient, http, publicActions } from "viem";
import type {
  Chain,
  Transport,
  Client,
  Account,
  RpcSchema,
  PublicActions,
  WalletActions,
  PublicClient,
  LocalAccount,
} from "viem";
import {
  baseSepolia,
  avalancheFuji,
  base,
  sei,
  seiTestnet,
  polygon,
  polygonAmoy,
  mainnet,
  sepolia,
  goerli,
  arbitrum,
  arbitrumSepolia,
  arbitrumGoerli,
  optimism,
  optimismSepolia,
  optimismGoerli,
  polygonMumbai,
  bsc,
  bscTestnet,
  avalanche,
  zkSync,
  zkSyncSepoliaTestnet,
  linea,
  lineaSepolia,
  celo,
  celoAlfajores,
  gnosis,
  gnosisChiado,
  fantom,
  fantomTestnet,
} from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { Hex } from "viem";

export type SignerWallet<
  chain extends Chain = Chain,
  transport extends Transport = Transport,
  account extends Account = Account,
> = Client<
  transport,
  chain,
  account,
  RpcSchema,
  PublicActions<transport, chain, account> & WalletActions<chain, account>
>;

export type ConnectedClient<
  transport extends Transport = Transport,
  chain extends Chain | undefined = Chain,
  account extends Account | undefined = undefined,
> = PublicClient<transport, chain, account>;

export type EvmSigner = SignerWallet<Chain, Transport, Account> | LocalAccount;

export function createConnectedClient(
  network: string,
): ConnectedClient<Transport, Chain, undefined> {
  const chain = getChainFromNetwork(network);
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;
  const rpcUrl = alchemyApiKey ? getAlchemyRpcUrl(network, alchemyApiKey) : undefined;

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);
}

export function createSigner(network: string, privateKey: Hex): SignerWallet<Chain> {
  const chain = getChainFromNetwork(network);
  const alchemyApiKey = process.env.ALCHEMY_API_KEY;
  const rpcUrl = alchemyApiKey ? getAlchemyRpcUrl(network, alchemyApiKey) : undefined;

  return createWalletClient({
    chain,
    transport: http(rpcUrl),
    account: privateKeyToAccount(privateKey),
  }).extend(publicActions);
}

function getAlchemyRpcUrl(network: string, apiKey: string): string {
  switch (network) {
    case "ethereum":
      return `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
    case "sepolia":
      return `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
    case "base":
      return `https://base-mainnet.g.alchemy.com/v2/${apiKey}`;
    case "base-sepolia":
      return `https://base-sepolia.g.alchemy.com/v2/${apiKey}`;
    case "arbitrum":
      return `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
    case "arbitrum-sepolia":
      return `https://arb-sepolia.g.alchemy.com/v2/${apiKey}`;
    case "optimism":
      return `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`;
    case "optimism-sepolia":
      return `https://opt-sepolia.g.alchemy.com/v2/${apiKey}`;
    case "polygon":
      return `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`;
    case "polygon-amoy":
      return `https://polygon-amoy.g.alchemy.com/v2/${apiKey}`;
    default:
      throw new Error(`Alchemy not supported for network: ${network}`);
  }
}

function getChainFromNetwork(network: string | undefined): Chain {
  if (!network) {
    throw new Error("NETWORK environment variable is not set");
  }

  switch (network) {
    // Base
    case "base":
      return base;
    case "base-sepolia":
      return baseSepolia;
    // Ethereum
    case "ethereum":
      return mainnet;
    case "sepolia":
      return sepolia;
    case "goerli":
      return goerli;
    // Arbitrum
    case "arbitrum":
      return arbitrum;
    case "arbitrum-sepolia":
      return arbitrumSepolia;
    case "arbitrum-goerli":
      return arbitrumGoerli;
    // Optimism
    case "optimism":
      return optimism;
    case "optimism-sepolia":
      return optimismSepolia;
    case "optimism-goerli":
      return optimismGoerli;
    // Polygon
    case "polygon":
      return polygon;
    case "polygon-amoy":
      return polygonAmoy;
    case "polygon-mumbai":
      return polygonMumbai;
    // BSC
    case "bsc":
      return bsc;
    case "bsc-testnet":
      return bscTestnet;
    // Avalanche
    case "avalanche-fuji":
      return avalancheFuji;
    case "avalanche":
      return avalanche;
    // Sei
    case "sei":
      return sei;
    case "sei-testnet":
      return seiTestnet;
    // zkSync
    case "zksync-era":
      return zkSync;
    case "zksync-sepolia":
      return zkSyncSepoliaTestnet;
    // Linea
    case "linea":
      return linea;
    case "linea-sepolia":
      return lineaSepolia;
    // Celo
    case "celo":
      return celo;
    case "celo-alfajores":
      return celoAlfajores;
    // Gnosis
    case "gnosis":
      return gnosis;
    case "gnosis-chiado":
      return gnosisChiado;
    // Fantom
    case "fantom":
      return fantom;
    case "fantom-testnet":
      return fantomTestnet;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}
