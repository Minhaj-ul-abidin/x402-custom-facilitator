import { KeyPairSigner } from "@solana/kit";
import { ExactSvmPayload } from "../types/payment";

export function getRpcClient(network: string) {
  // Simplified RPC client creation
  if (network === "solana-devnet") {
    return {
      simulateTransaction: async (tx: any, config: any) => ({
        value: { err: null }
      })
    };
  } else if (network === "solana") {
    return {
      simulateTransaction: async (tx: any, config: any) => ({
        value: { err: null }
      })
    };
  } else {
    throw new Error(`Unsupported SVM network: ${network}`);
  }
}

export function getRpcSubscriptions(network: string) {
  // Simplified subscriptions
  return {};
}

export function decodeTransactionFromPayload(svmPayload: ExactSvmPayload) {
  // Simplified transaction decoding
  return { messageBytes: new Uint8Array() };
}

export async function signAndSimulateTransaction(
  signer: KeyPairSigner,
  transaction: any,
  rpc: any
) {
  return rpc.simulateTransaction(transaction, { commitment: "confirmed" });
}