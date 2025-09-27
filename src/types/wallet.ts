import { createSigner as createEvmSigner, createConnectedClient as createEvmConnectedClient } from "./evm";
import { createSigner as createSvmSigner, createConnectedClient as createSvmConnectedClient } from "./svm";
import { SupportedEVMNetworks, SupportedSVMNetworks } from "./network";
import { KeyPairSigner } from "@solana/kit";

export type ConnectedClient = ReturnType<typeof createEvmConnectedClient> | ReturnType<typeof createSvmConnectedClient>;
export type Signer = any;

export function createConnectedClient(network: string): ConnectedClient {
  if (SupportedEVMNetworks.includes(network as any)) {
    return createEvmConnectedClient(network);
  } else if (SupportedSVMNetworks.includes(network as any)) {
    return createSvmConnectedClient(network);
  }
  throw new Error(`Unsupported network: ${network}`);
}

export function createSigner(network: string, privateKey: string): any {
  if (SupportedEVMNetworks.includes(network as any)) {
    return createEvmSigner(network, privateKey as any);
  } else if (SupportedSVMNetworks.includes(network as any)) {
    return createSvmSigner(network, privateKey);
  }
  throw new Error(`Unsupported network: ${network}`);
}
