import { config } from "dotenv";
import express, { Request, Response } from "express";
import { verify, settle } from "./src/facilitator";
import {
  PaymentRequirementsSchema,
  PaymentPayloadSchema,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  createConnectedClient,
  createSigner,
} from "./src/types";
import type { PaymentPayload, PaymentRequirements } from "./src/types/payment";

config();

// Configure Alchemy API key
process.env.ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "Sk1k_Z9AztMyclIQHflPimsT62pi6C6T";

const EVM_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY || "";
const SVM_PRIVATE_KEY = process.env.SVM_PRIVATE_KEY || "";

if (!EVM_PRIVATE_KEY && !SVM_PRIVATE_KEY) {
  console.error("Missing FACILITATOR_PRIVATE_KEY or EVM_PRIVATE_KEY or SVM_PRIVATE_KEY");
  process.exit(1);
}

const app = express();
app.use(express.json());

type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

type SettleRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/verify", (req: Request, res: Response) => {
  res.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
  });
});

app.post("/verify", async (req: Request, res: Response) => {
  try {
    const body: VerifyRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    let client;
    if (SupportedEVMNetworks.includes(paymentRequirements.network as any)) {
      client = createConnectedClient(paymentRequirements.network);
    } else if (SupportedSVMNetworks.includes(paymentRequirements.network as any)) {
      if (!SVM_PRIVATE_KEY) {
        throw new Error("SVM_PRIVATE_KEY required for Solana");
      }
      client = await createSigner(paymentRequirements.network, SVM_PRIVATE_KEY);
    } else {
      throw new Error(`Unsupported network: ${paymentRequirements.network}`);
    }

    const result = await verify(client, paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: "Invalid request" });
  }
});

app.get("/settle", (req: Request, res: Response) => {
  res.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments",
  });
});

app.get("/supported", async (req: Request, res: Response) => {
  const kinds = [];

  if (EVM_PRIVATE_KEY) {
    kinds.push(...SupportedEVMNetworks.map(network => ({
      x402Version: 1,
      scheme: "exact",
      network,
    })));
  }

  if (SVM_PRIVATE_KEY) {
    kinds.push(...SupportedSVMNetworks.map(network => ({
      x402Version: 1,
      scheme: "exact",
      network,
    })));
  }

  res.json({ kinds });
});

app.post("/settle", async (req: Request, res: Response) => {
  try {
    const body: SettleRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(body.paymentRequirements);
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    let signer;
    if (SupportedEVMNetworks.includes(paymentRequirements.network as any)) {
      if (!EVM_PRIVATE_KEY) {
        throw new Error("EVM_PRIVATE_KEY required");
      }
      signer = await createSigner(paymentRequirements.network, EVM_PRIVATE_KEY as `0x${string}`);
    } else if (SupportedSVMNetworks.includes(paymentRequirements.network as any)) {
      if (!SVM_PRIVATE_KEY) {
        throw new Error("SVM_PRIVATE_KEY required");
      }
      signer = await createSigner(paymentRequirements.network, SVM_PRIVATE_KEY);
    } else {
      throw new Error(`Unsupported network: ${paymentRequirements.network}`);
    }

    const result = await settle(signer, paymentPayload, paymentRequirements);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: "Invalid request" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`x402 Facilitator Server running on http://localhost:${PORT}`);
});
