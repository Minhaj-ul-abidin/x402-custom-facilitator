import { verify as verifyExactEvm, settle as settleExactEvm } from "./schemes/exact/evm";
import { verify as verifyExactSvm, settle as settleExactSvm } from "./schemes/exact/svm";
import { SupportedEVMNetworks, SupportedSVMNetworks, Network } from "./types/network";
import {
  ConnectedClient as EvmConnectedClient,
  SignerWallet as EvmSignerWallet,
} from "./types/evm";
import { ConnectedClient, Signer } from "./types/wallet";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  ExactEvmPayload,
} from "./types/payment";
import { Chain, Transport, Account } from "viem";
import { KeyPairSigner } from "@solana/kit";

/**
 * Verifies a payment payload against the required payment details
 */
export async function verify<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined,
>(
  client: ConnectedClient | Signer,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  if (paymentRequirements.scheme === "exact") {
    if (SupportedEVMNetworks.includes(paymentRequirements.network as Network)) {
      return verifyExactEvm(
        client as EvmConnectedClient<transport, chain, account>,
        payload,
        paymentRequirements,
      );
    }

    if (SupportedSVMNetworks.includes(paymentRequirements.network as Network)) {
      return await verifyExactSvm(client as KeyPairSigner, payload, paymentRequirements);
    }
  }

  return {
    isValid: false,
    invalidReason: "invalid_scheme",
    payer: SupportedEVMNetworks.includes(paymentRequirements.network as Network)
      ? (payload.payload as ExactEvmPayload).authorization.from
      : "",
  };
}

/**
 * Settles a payment payload
 */
export async function settle<transport extends Transport, chain extends Chain>(
  client: Signer,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  if (paymentRequirements.scheme === "exact") {
    if (SupportedEVMNetworks.includes(paymentRequirements.network as Network)) {
      return await settleExactEvm(
        client as EvmSignerWallet<chain, transport>,
        payload,
        paymentRequirements,
      );
    }

    if (SupportedSVMNetworks.includes(paymentRequirements.network as Network)) {
      return await settleExactSvm(client as KeyPairSigner, payload, paymentRequirements);
    }
  }

  return {
    success: false,
    errorReason: "invalid_scheme",
    transaction: "",
    network: paymentRequirements.network,
    payer: SupportedEVMNetworks.includes(paymentRequirements.network as Network)
      ? (payload.payload as ExactEvmPayload).authorization.from
      : "",
  };
}
