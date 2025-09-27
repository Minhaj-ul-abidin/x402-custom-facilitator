export * from "./network";
export * from "./payment";
export {
  ConnectedClient as EvmConnectedClient,
  SignerWallet as EvmSignerWallet,
  createConnectedClient as createEvmConnectedClient,
  createSigner as createEvmSigner,
} from "./evm";
export {
  createConnectedClient as createSvmConnectedClient,
  createSigner as createSvmSigner,
} from "./svm";
export * from "./wallet";

// Re-export the main functions with unique names
export { createEvmConnectedClient as createConnectedClient };
export { createEvmSigner as createSigner };