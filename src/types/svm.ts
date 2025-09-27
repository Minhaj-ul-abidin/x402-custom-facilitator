import { KeyPairSigner } from "@solana/kit";

export type SvmSigner = KeyPairSigner;

export function createSvmSigner(network: string, privateKey: string): Promise<KeyPairSigner> {
  // Simplified mock implementation
  const mockSigner: KeyPairSigner = {
    address: { toString: () => "mock_svm_address" } as any,
    keyPair: {} as any,
    signMessages: async () => ({} as any),
    signTransactions: async () => ({} as any),
  };
  return Promise.resolve(mockSigner);
}

export function createConnectedClient(network: string) {
  return createSvmSigner(network, "");
}

export async function createSigner(network: string, privateKey: string) {
  return createSvmSigner(network, privateKey);
}