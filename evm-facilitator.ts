import {
  Account,
  Address,
  Chain,
  getAddress,
  Hex,
  parseErc6492Signature,
  Transport,
} from "viem";
import { getNetworkId } from "./src/shared/network";
import { getVersion, getERC20Balance } from "./src/shared/evm-utils";
import { usdcABI as abi, authorizationTypes } from "./src/shared/usdc-abi";
import { config } from "./src/shared/evm-config";
import { ConnectedClient, SignerWallet } from "./src/types/evm";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  ExactEvmPayload,
} from "./src/types/payment";

const SCHEME = "exact";

/**
 * Verifies a payment payload against the required payment details
 *
 * This function performs several verification steps:
 * - Verifies protocol version compatibility
 * - Validates the permit signature
 * - Confirms USDC contract address is correct for the chain
 * - Checks permit deadline is sufficiently in the future
 * - Verifies client has sufficient USDC balance
 * - Ensures payment amount meets required minimum
 *
 * @param client - The public client used for blockchain interactions
 * @param payload - The signed payment payload containing transfer parameters and signature
 * @param paymentRequirements - The payment requirements that the payload must satisfy
 * @returns A ValidPaymentRequest indicating if the payment is valid and any invalidation reason
 */
export async function verify<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined,
>(
  client: ConnectedClient<transport, chain, account>,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<VerifyResponse> {
  /* TODO: work with security team on brainstorming more verification steps
  verification steps:
    - ✅ verify payload version
    - ✅ verify usdc address is correct for the chain
    - ✅ verify permit signature
    - ✅ verify permit deadline is sufficiently in the future (at least 5 minutes from now)
    - ✅ verify client has sufficient usdc balance
    - ✅ verify payment amount meets required minimum
    - 🔄 verify client's usdc is not frozen
    - 🔄 verify spender's usdc is not frozen
    - 🔄 verify permit has not been used
  */

  const exactEvmPayload = payload.payload as ExactEvmPayload;

  // verify permit signature
  const permitTypedData = {
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization" as const,
    domain: {
      name: "USD Coin",
      version: "2",
      chainId: client.chain.id,
      verifyingContract: paymentRequirements.asset as Address,
    },
    message: {
      from: exactEvmPayload.authorization.from,
      to: exactEvmPayload.authorization.to,
      value: exactEvmPayload.authorization.value,
      validAfter: exactEvmPayload.authorization.validAfter,
      validBefore: exactEvmPayload.authorization.validBefore,
      nonce: exactEvmPayload.authorization.nonce,
    },
  };

  const recoveredAddress = await client.verifyTypedData({
    address: exactEvmPayload.authorization.from as Address,
    ...permitTypedData,
    signature: exactEvmPayload.signature as Hex,
  });

  if (!recoveredAddress) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_signature",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (
    getAddress(exactEvmPayload.authorization.to) !==
    getAddress(paymentRequirements.payTo)
  ) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_recipient_mismatch",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (
    BigInt(exactEvmPayload.authorization.validBefore) <
    BigInt(Math.floor(Date.now() / 1000) + 6)
  ) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_valid_before",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (
    BigInt(exactEvmPayload.authorization.validAfter) >
    BigInt(Math.floor(Date.now() / 1000))
  ) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_valid_after",
      payer: exactEvmPayload.authorization.from,
    };
  }

  const balance = await getERC20Balance(
    client,
    paymentRequirements.asset as Address,
    exactEvmPayload.authorization.from as Address
  );
  if (balance < BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: "insufficient_funds",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (
    BigInt(exactEvmPayload.authorization.value) <
    BigInt(paymentRequirements.maxAmountRequired)
  ) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_value",
      payer: exactEvmPayload.authorization.from,
    };
  }

  return {
    isValid: true,
    invalidReason: undefined,
    payer: exactEvmPayload.authorization.from,
  };
}

/**
 * Settles a payment by executing the permit-based transfer on-chain
 *
 * This function:
 * - First verifies the payment payload is valid
 * - Executes the receiveWithAuthorization function on the USDC contract
 * - Handles transaction execution and confirmation
 * - Returns settlement result with transaction details
 *
 * @param client - The wallet client used for sending transactions
 * @param payload - The signed payment payload to settle
 * @param paymentRequirements - The payment requirements to validate against
 * @returns A SettleResponse indicating settlement success/failure with transaction details
 */
export async function settle<chain extends Chain, transport extends Transport>(
  client: SignerWallet<chain, transport>,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements
): Promise<SettleResponse> {
  const exactEvmPayload = payload.payload as ExactEvmPayload;

  const valid = await verify(client, payload, paymentRequirements);

  if (!valid.isValid) {
    return {
      success: false,
      network: payload.network,
      transaction: "",
      errorReason: valid.invalidReason ?? "invalid_scheme",
      payer: exactEvmPayload.authorization.from,
    };
  }

  const { signature } = parseErc6492Signature(exactEvmPayload.signature as Hex);

  const tx = await client.writeContract({
    address: paymentRequirements.asset as Address,
    abi,
    functionName: "transferWithAuthorization",
    args: [
      exactEvmPayload.authorization.from as Address,
      exactEvmPayload.authorization.to as Address,
      BigInt(exactEvmPayload.authorization.value),
      BigInt(exactEvmPayload.authorization.validAfter),
      BigInt(exactEvmPayload.authorization.validBefore),
      exactEvmPayload.authorization.nonce as Hex,
      signature,
    ],
  } as any);

  const receipt = await client.waitForTransactionReceipt({ hash: tx });

  if (receipt.status !== "success") {
    return {
      success: false,
      errorReason: "invalid_transaction_state",
      transaction: tx,
      network: payload.network,
      payer: exactEvmPayload.authorization.from,
    };
  }

  return {
    success: true,
    transaction: tx,
    network: payload.network,
    payer: exactEvmPayload.authorization.from,
  };
}
