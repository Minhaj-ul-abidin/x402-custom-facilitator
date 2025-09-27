import { Account, Address, getAddress, Hex, parseErc6492Signature, Transport, Chain } from "viem";
import { getNetworkId } from "../../shared/network";
import { Network } from "../../types/network";
import { getVersion, getERC20Balance, getUsdcChainConfigForChain } from "../../shared/evm-utils";
import { usdcABI, authorizationTypes } from "../../shared/usdc-abi";
import { ConnectedClient, SignerWallet } from "../../types/evm";
import {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
  ExactEvmPayload,
} from "../../types/payment";

const SCHEME = "exact";

export async function verify<
  transport extends Transport,
  chain extends Chain,
  account extends Account | undefined,
>(
  client: ConnectedClient<transport, chain, account>,
  payload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<VerifyResponse> {
  const exactEvmPayload = payload.payload as ExactEvmPayload;

  if (payload.scheme !== SCHEME || paymentRequirements.scheme !== SCHEME) {
    return {
      isValid: false,
      invalidReason: "unsupported_scheme",
      payer: exactEvmPayload.authorization.from,
    };
  }

  let name: string;
  let chainId: number;
  let erc20Address: Address;
  let version: string;
  try {
    chainId = getNetworkId(payload.network as Network);
    const chainConfig = getUsdcChainConfigForChain(chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }
    name = paymentRequirements.extra?.name ?? chainConfig.usdcName;
    erc20Address = paymentRequirements.asset as Address;
    version = paymentRequirements.extra?.version ?? (await getVersion(client));
  } catch {
    return {
      isValid: false,
      invalidReason: "invalid_network",
      payer: exactEvmPayload.authorization.from,
    };
  }

  const permitTypedData = {
    types: authorizationTypes,
    primaryType: "TransferWithAuthorization" as const,
    domain: {
      name,
      version,
      chainId,
      verifyingContract: erc20Address,
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

  if (getAddress(exactEvmPayload.authorization.to) !== getAddress(paymentRequirements.payTo)) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_recipient_mismatch",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (
    BigInt(exactEvmPayload.authorization.validBefore) < BigInt(Math.floor(Date.now() / 1000) + 6)
  ) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_valid_before",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (BigInt(exactEvmPayload.authorization.validAfter) > BigInt(Math.floor(Date.now() / 1000))) {
    return {
      isValid: false,
      invalidReason: "invalid_exact_evm_payload_authorization_valid_after",
      payer: exactEvmPayload.authorization.from,
    };
  }

  const balance = await getERC20Balance(
    client,
    erc20Address,
    exactEvmPayload.authorization.from as Address,
  );
  if (balance < BigInt(paymentRequirements.maxAmountRequired)) {
    return {
      isValid: false,
      invalidReason: "insufficient_funds",
      payer: exactEvmPayload.authorization.from,
    };
  }

  if (BigInt(exactEvmPayload.authorization.value) < BigInt(paymentRequirements.maxAmountRequired)) {
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

export async function settle<transport extends Transport, chain extends Chain>(
  wallet: SignerWallet<chain, transport>,
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
): Promise<SettleResponse> {
  const payload = paymentPayload.payload as ExactEvmPayload;

  const valid = await verify(wallet, paymentPayload, paymentRequirements);

  if (!valid.isValid) {
    return {
      success: false,
      network: paymentPayload.network,
      transaction: "",
      errorReason: valid.invalidReason ?? "invalid_scheme",
      payer: payload.authorization.from,
    };
  }

  const { signature } = parseErc6492Signature(payload.signature as Hex);

  const tx = await wallet.writeContract({
    address: paymentRequirements.asset as Address,
    abi: usdcABI,
    functionName: "transferWithAuthorization" as const,
    args: [
      payload.authorization.from as Address,
      payload.authorization.to as Address,
      BigInt(payload.authorization.value),
      BigInt(payload.authorization.validAfter),
      BigInt(payload.authorization.validBefore),
      payload.authorization.nonce as Hex,
      signature,
    ],
    chain: wallet.chain as Chain,
  });

  const receipt = await wallet.waitForTransactionReceipt({ hash: tx });

  if (receipt.status !== "success") {
    return {
      success: false,
      errorReason: "invalid_transaction_state",
      transaction: tx,
      network: paymentPayload.network,
      payer: payload.authorization.from,
    };
  }

  return {
    success: true,
    transaction: tx,
    network: paymentPayload.network,
    payer: payload.authorization.from,
  };
}