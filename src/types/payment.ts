import { z } from "zod";

const EvmAddressRegex = /^0x[0-9a-fA-F]{40}$/;
const HexEncoded64ByteRegex = /^0x[0-9a-fA-F]{64}$/;
const EvmSignatureRegex = /^0x[0-9a-fA-F]+$/;
const isInteger = (value: string) => Number.isInteger(Number(value)) && Number(value) >= 0;
const hasMaxLength = (maxLength: number) => (value: string) => value.length <= maxLength;
const EvmMaxAtomicUnits = 18;

export const schemes = ["exact"] as const;
export const x402Versions = [1] as const;
export const ErrorReasons = [
  "insufficient_funds",
  "invalid_exact_evm_payload_authorization_valid_after",
  "invalid_exact_evm_payload_authorization_valid_before",
  "invalid_exact_evm_payload_authorization_value",
  "invalid_exact_evm_payload_signature",
  "invalid_exact_evm_payload_recipient_mismatch",
  "invalid_exact_svm_payload_transaction_simulation_failed",
  "invalid_network",
  "invalid_scheme",
  "invalid_transaction_state",
  "unsupported_scheme",
  "unexpected_settle_error",
  "unexpected_verify_error",
  "settle_exact_svm_block_height_exceeded",
  "settle_exact_svm_transaction_confirmation_timed_out",
] as const;

export const ExactEvmPayloadAuthorizationSchema = z.object({
  from: z.string().regex(EvmAddressRegex),
  to: z.string().regex(EvmAddressRegex),
  value: z.string().refine(isInteger).refine(hasMaxLength(EvmMaxAtomicUnits)),
  validAfter: z.string().refine(isInteger),
  validBefore: z.string().refine(isInteger),
  nonce: z.string().regex(HexEncoded64ByteRegex),
});
export type ExactEvmPayloadAuthorization = z.infer<typeof ExactEvmPayloadAuthorizationSchema>;

export const ExactEvmPayloadSchema = z.object({
  signature: z.string().regex(EvmSignatureRegex),
  authorization: ExactEvmPayloadAuthorizationSchema,
});
export type ExactEvmPayload = z.infer<typeof ExactEvmPayloadSchema>;

const Base64EncodedRegex = /^[A-Za-z0-9+/]+=*$/;
export const ExactSvmPayloadSchema = z.object({
  transaction: z.string().regex(Base64EncodedRegex),
});
export type ExactSvmPayload = z.infer<typeof ExactSvmPayloadSchema>;

export const PaymentPayloadSchema = z.object({
  x402Version: z.number().refine(val => x402Versions.includes(val as 1)),
  scheme: z.enum(schemes),
  network: z.string(),
  payload: z.any(),
});

export const PaymentRequirementsSchema = z.object({
  scheme: z.enum(schemes),
  network: z.string(),
  maxAmountRequired: z.string().refine(isInteger),
  asset: z.string(),
  payTo: z.string(),
  extra: z.record(z.any()).optional(),
});

export type PaymentPayload = z.infer<typeof PaymentPayloadSchema>;
export type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;

export const VerifyResponseSchema = z.object({
  isValid: z.boolean(),
  invalidReason: z.enum(ErrorReasons).optional(),
  payer: z.string().optional(),
});
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

export const SettleResponseSchema = z.object({
  success: z.boolean(),
  errorReason: z.enum(ErrorReasons).optional(),
  payer: z.string().optional(),
  transaction: z.string(),
  network: z.string(),
});
export type SettleResponse = z.infer<typeof SettleResponseSchema>;