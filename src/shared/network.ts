import { EvmNetworkToChainId, SvmNetworkToChainId } from "../types/network";
import { Network } from "../types/network";

export function getNetworkId(network: Network): number {
  if (EvmNetworkToChainId.has(network)) {
    return EvmNetworkToChainId.get(network)!;
  }
  if (SvmNetworkToChainId.has(network)) {
    return SvmNetworkToChainId.get(network)!;
  }
  throw new Error(`Unsupported network: ${network}`);
}