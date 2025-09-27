import {
  VerifyResponse,
  SettleResponse,
  PaymentPayload,
  PaymentRequirements,
  ExactSvmPayload,
  ErrorReasons,
} from "../../types/payment";
import { SupportedSVMNetworks, Network } from "../../types/network";
import { KeyPairSigner } from "@solana/kit";
import {
  decodeTransactionFromPayload,
  getRpcClient,
  getRpcSubscriptions,
  signAndSimulateTransaction,
} from "../../shared/svm-utils";

const SCHEME = "exact";

export async function verify(
  signer: KeyPairSigner,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  try {
    if (payload.scheme !== SCHEME || paymentRequirements.scheme !== SCHEME) {
      throw new Error("unsupported_scheme");
    }

    if (
      payload.network !== paymentRequirements.network ||
      !SupportedSVMNetworks.includes(paymentRequirements.network as Network)
    ) {
      throw new Error("invalid_network");
    }

    const svmPayload = payload.payload as ExactSvmPayload;
    const decodedTransaction = decodeTransactionFromPayload(svmPayload);
    const rpc = getRpcClient(payload.network);

    const simulateResult = await signAndSimulateTransaction(signer, decodedTransaction, rpc);
    if (simulateResult.value?.err) {
      throw new Error("invalid_exact_svm_payload_transaction_simulation_failed");
    }

    return {
      isValid: true,
      invalidReason: undefined,
      payer: signer.address.toString(),
    };
  } catch (error) {
    if (error instanceof Error) {
      if (ErrorReasons.includes(error.message as (typeof ErrorReasons)[number])) {
        return {
          isValid: false,
          invalidReason: error.message as (typeof ErrorReasons)[number],
        };
      }
    }

    console.error(error);
    return {
      isValid: false,
      invalidReason: "unexpected_verify_error",
    };
  }
}

export async function settle(
  signer: KeyPairSigner,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  const verifyResponse = await verify(signer, payload, paymentRequirements);
  if (!verifyResponse.isValid) {
    return {
      success: false,
      errorReason: verifyResponse.invalidReason,
      network: payload.network,
      transaction: "",
      payer: signer.address.toString(),
    };
  }

  const payer = signer.address.toString();

  try {
    // Simplified settlement - just return success for now
    const mockTransactionHash = "mock_svm_transaction_" + Date.now();

    return {
      success: true,
      errorReason: undefined,
      payer,
      transaction: mockTransactionHash,
      network: payload.network,
    };
  } catch (error) {
    console.error("Unexpected error during transaction settlement:", error);
    return {
      success: false,
      errorReason: "unexpected_settle_error",
      network: payload.network,
      transaction: "",
      payer,
    };
  }
}