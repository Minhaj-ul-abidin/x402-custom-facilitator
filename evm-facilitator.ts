import { Account, Address, Chain, getAddress, Hex, parseErc6492Signature, Transport } from "viem";
import { getNetworkId } from "../../../shared";
import { getVersion, getERC20Balance } from "../../../shared/evm";
import {
  usdcABI as abi,
  authorizationTypes,
  config,
  ConnectedClient,
  SignerWallet,
} from "../../../types/shared/evm";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  ExactEvmPayload,
} from "../../../types/verify";
import { SCHEME } from "../../exact";

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
  paymentRequirements: PaymentRequirements,
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

  const exactEvmPayload = payload as ExactEvmPayload;
  const networkId = getNetworkId(client.chain);

  // verify version
  const supportedVersion = await getVersion(client, networkId);
  if (exactEvmPayload.version !== supportedVersion) {
    return {
      isValid: false,
      invalidReason: "unsupported_version",
      scheme: SCHEME,
      network: networkId,
    };
  }

  // verify usdc address is correct for the chain
  const correctUsdcAddress = config[networkId].usdcAddress;
  if (exactEvmPayload.token !== correctUsdcAddress) {
    return {
      isValid: false,
      invalidReason: "incorrect_usdc_address",
      scheme: SCHEME,
      network: networkId,
    };
  }

  // verify permit signature
  let permitSignatureIsValid = false;
  try {
    const permitHash = await client.readContract({
      address: exactEvmPayload.token,
      abi,
      functionName: "DOMAIN_SEPARATOR",
    });

    const types = authorizationTypes[exactEvmPayload.version];
    const primaryType = Object.keys(types)[0];
    const domain = {
      name: await client.readContract({
        address: exactEvmPayload.token,
        abi,
        functionName: "name",
      }),
      version: exactEvmPayload.version.toString(),
      chainId: client.chain.id,
      verifyingContract: exactEvmPayload.token,
    };

    const message = {
      from: exactEvmPayload.from,
      to: exactEvmPayload.to,
      value: exactEvmPayload.value,
      validAfter: exactEvmPayload.validAfter,
      validBefore: exactEvmPayload.validBefore,
      nonce: exactEvmPayload.nonce,
    };

    const signature = parseErc6492Signature(exactEvmPayload.signature);
    const { success } = await client.verifyTypedData({
      address: getAddress(exactEvmPayload.from),
      domain,
      types,
      primaryType,
      message,
      signature: signature.signature,
    });

    permitSignatureIsValid = success;
  } catch (error) {
    permitSignatureIsValid = false;
  }

  if (!permitSignatureIsValid) {
    return {
      isValid: false,
      invalidReason: "invalid_permit_signature",
      scheme: SCHEME,
      network: networkId,
    };
  }

  // verify permit deadline is sufficiently in the future (at least 5 minutes from now)
  const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + 5 * 60;
  if (exactEvmPayload.validBefore < fiveMinutesFromNow) {
    return {
      isValid: false,
      invalidReason: "permit_deadline_too_soon",
      scheme: SCHEME,
      network: networkId,
    };
  }

  // verify client has sufficient usdc balance
  const balance = await getERC20Balance(client, exactEvmPayload.from, exactEvmPayload.token);
  if (balance < exactEvmPayload.value) {
    return {
      isValid: false,
      invalidReason: "insufficient_balance",
      scheme: SCHEME,
      network: networkId,
    };
  }

  // verify payment amount meets required minimum
  if (exactEvmPayload.value < paymentRequirements.amount) {
    return {
      isValid: false,
      invalidReason: "insufficient_payment_amount",
      scheme: SCHEME,
      network: networkId,
    };
  }

  return {
    isValid: true,
    scheme: SCHEME,
    network: networkId,
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
export async function settle<
  transport extends Transport,
  chain extends Chain,
  account extends Account,
>(
  client: SignerWallet<transport, chain, account>,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  const verifyResponse = await verify(client, payload, paymentRequirements);
  if (!verifyResponse.isValid) {
    return {
      isSettled: false,
      errorReason: verifyResponse.invalidReason,
      scheme: SCHEME,
      network: verifyResponse.network,
    };
  }

  const exactEvmPayload = payload as ExactEvmPayload;
  const networkId = getNetworkId(client.chain);

  try {
    const signature = parseErc6492Signature(exactEvmPayload.signature);
    const hash = await client.writeContract({
      address: exactEvmPayload.token,
      abi,
      functionName: "receiveWithAuthorization",
      args: [
        exactEvmPayload.from,
        exactEvmPayload.to,
        exactEvmPayload.value,
        exactEvmPayload.validAfter,
        exactEvmPayload.validBefore,
        exactEvmPayload.nonce,
        signature.signature,
      ],
    });

    // Wait for transaction confirmation
    const receipt = await client.waitForTransactionReceipt({ hash });

    return {
      isSettled: receipt.status === "success",
      transactionHash: hash,
      scheme: SCHEME,
      network: networkId,
      errorReason: receipt.status !== "success" ? "transaction_failed" : undefined,
    };
  } catch (error) {
    return {
      isSettled: false,
      errorReason: "settlement_failed",
      scheme: SCHEME,
      network: networkId,
    };
  }
}