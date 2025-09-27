import { config } from "dotenv";
import express, { Request, Response } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import logger, {
  morganStream,
  paymentLogger,
  systemLogger,
} from "./src/utils/logger";
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

// Configure Alchemy API key from environment
if (!process.env.ALCHEMY_API_KEY) {
  console.warn("ALCHEMY_API_KEY not set - using default RPC endpoints");
}

const EVM_PRIVATE_KEY =
  process.env.FACILITATOR_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY || "";
const SVM_PRIVATE_KEY = process.env.SVM_PRIVATE_KEY || "";

if (!EVM_PRIVATE_KEY && !SVM_PRIVATE_KEY) {
  console.error(
    "Missing FACILITATOR_PRIVATE_KEY or EVM_PRIVATE_KEY or SVM_PRIVATE_KEY"
  );
  process.exit(1);
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "x402 Facilitator API",
      version: "1.0.0",
      description:
        "Production-ready facilitator server for the x402 payment protocol supporting EVM and Solana networks",
      contact: {
        name: "x402 Community",
        url: "https://github.com/coinbase/x402",
      },
      license: {
        name: "Apache-2.0",
        url: "https://opensource.org/licenses/Apache-2.0",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        PaymentPayload: {
          type: "object",
          required: ["x402Version", "scheme", "network", "payload"],
          properties: {
            x402Version: {
              type: "number",
              example: 1,
              description: "x402 protocol version",
            },
            scheme: {
              type: "string",
              enum: ["exact"],
              example: "exact",
              description: "Payment scheme",
            },
            network: {
              type: "string",
              example: "ethereum",
              description: "Blockchain network",
            },
            payload: {
              type: "object",
              description: "Scheme-specific payment payload",
            },
          },
        },
        PaymentRequirements: {
          type: "object",
          required: [
            "scheme",
            "network",
            "maxAmountRequired",
            "asset",
            "payTo",
          ],
          properties: {
            scheme: {
              type: "string",
              enum: ["exact"],
              example: "exact",
              description: "Payment scheme",
            },
            network: {
              type: "string",
              example: "ethereum",
              description: "Blockchain network",
            },
            maxAmountRequired: {
              type: "string",
              example: "1000000",
              description: "Maximum amount required in smallest unit",
            },
            asset: {
              type: "string",
              example: "0xA0b86a33E6441fe893a0C9893c9e1B9AcC79c3bF",
              description: "Asset contract address",
            },
            payTo: {
              type: "string",
              example: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
              description: "Recipient address",
            },
            extra: {
              type: "object",
              description: "Additional scheme-specific requirements",
            },
          },
        },
        VerifyResponse: {
          type: "object",
          required: ["isValid"],
          properties: {
            isValid: {
              type: "boolean",
              example: true,
              description: "Whether the payment is valid",
            },
            invalidReason: {
              type: "string",
              example: "insufficient_funds",
              description: "Reason for invalidity if applicable",
            },
            payer: {
              type: "string",
              example: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
              description: "Payer address",
            },
          },
        },
        SettleResponse: {
          type: "object",
          required: ["success", "transaction", "network"],
          properties: {
            success: {
              type: "boolean",
              example: true,
              description: "Whether the settlement was successful",
            },
            errorReason: {
              type: "string",
              example: "insufficient_funds",
              description: "Error reason if settlement failed",
            },
            payer: {
              type: "string",
              example: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
              description: "Payer address",
            },
            transaction: {
              type: "string",
              example: "0x1234567890abcdef...",
              description: "Transaction hash",
            },
            network: {
              type: "string",
              example: "ethereum",
              description: "Network where transaction was settled",
            },
          },
        },
        SupportedNetwork: {
          type: "object",
          required: ["x402Version", "scheme", "network"],
          properties: {
            x402Version: {
              type: "number",
              example: 1,
              description: "x402 protocol version",
            },
            scheme: {
              type: "string",
              example: "exact",
              description: "Payment scheme",
            },
            network: {
              type: "string",
              example: "ethereum",
              description: "Blockchain network",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "string",
              example: "Invalid request",
              description: "Error message",
            },
          },
        },
      },
    },
  },
  apis: ["./index.ts"], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();

// Request logging middleware
app.use(
  morgan("combined", {
    stream: morganStream,
    skip: (req, res) => {
      // Skip logging for Swagger UI assets to reduce noise
      return req.url.startsWith("/api-docs") && req.url !== "/api-docs";
    },
  })
);

// Body parsing middleware
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

type VerifyRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

type SettleRequest = {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
app.get("/health", (req: Request, res: Response) => {
  systemLogger.health();
  res.json({ status: "ok" });
});

/**
 * @swagger
 * /verify:
 *   get:
 *     summary: Get verify endpoint information
 *     description: Returns information about the verify endpoint
 *     tags: [Payment Verification]
 *     responses:
 *       200:
 *         description: Endpoint information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 endpoint:
 *                   type: string
 *                   example: "/verify"
 *                 description:
 *                   type: string
 *                   example: "POST to verify x402 payments"
 */
app.get("/verify", (req: Request, res: Response) => {
  res.json({
    endpoint: "/verify",
    description: "POST to verify x402 payments",
  });
});

/**
 * @swagger
 * /verify:
 *   post:
 *     summary: Verify x402 payment
 *     description: Verifies a payment payload against the required payment details
 *     tags: [Payment Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentPayload, paymentRequirements]
 *             properties:
 *               paymentPayload:
 *                 $ref: '#/components/schemas/PaymentPayload'
 *               paymentRequirements:
 *                 $ref: '#/components/schemas/PaymentRequirements'
 *     responses:
 *       200:
 *         description: Payment verification result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post("/verify", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  paymentLogger.verify.start(
    req.body.paymentRequirements?.network || "unknown",
    req.body.paymentRequirements?.scheme || "unknown",
    requestId
  );

  try {
    const body: VerifyRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(
      body.paymentRequirements
    );
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    let client;
    if (SupportedEVMNetworks.includes(paymentRequirements.network as any)) {
      paymentLogger.client.evm(paymentRequirements.network, "create");
      client = createConnectedClient(paymentRequirements.network);
    } else if (
      SupportedSVMNetworks.includes(paymentRequirements.network as any)
    ) {
      paymentLogger.client.svm(paymentRequirements.network, "create");
      if (!SVM_PRIVATE_KEY) {
        throw new Error("SVM_PRIVATE_KEY required for Solana");
      }
      client = await createSigner(paymentRequirements.network, SVM_PRIVATE_KEY);
    } else {
      throw new Error(`Unsupported network: ${paymentRequirements.network}`);
    }

    const result = await verify(client, paymentPayload, paymentRequirements);
    const duration = Date.now() - startTime;
    paymentLogger.verify.success(
      paymentRequirements.network,
      duration,
      result.isValid,
      requestId
    );
    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    paymentLogger.verify.error(
      req.body.paymentRequirements?.network || "unknown",
      error,
      duration,
      requestId
    );
    res.status(400).json({ error: "Invalid request" });
  }
});

/**
 * @swagger
 * /settle:
 *   get:
 *     summary: Get settle endpoint information
 *     description: Returns information about the settle endpoint
 *     tags: [Payment Settlement]
 *     responses:
 *       200:
 *         description: Endpoint information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 endpoint:
 *                   type: string
 *                   example: "/settle"
 *                 description:
 *                   type: string
 *                   example: "POST to settle x402 payments"
 */
app.get("/settle", (req: Request, res: Response) => {
  res.json({
    endpoint: "/settle",
    description: "POST to settle x402 payments",
  });
});

app.get("/supported", async (req: Request, res: Response) => {
  systemLogger.supported();
  const kinds = [];

  if (EVM_PRIVATE_KEY) {
    kinds.push(
      ...SupportedEVMNetworks.map((network) => ({
        x402Version: 1,
        scheme: "exact",
        network,
      }))
    );
  }

  if (SVM_PRIVATE_KEY) {
    kinds.push(
      ...SupportedSVMNetworks.map((network) => ({
        x402Version: 1,
        scheme: "exact",
        network,
      }))
    );
  }

  res.json({ kinds });
});

app.post("/settle", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  paymentLogger.settle.start(
    req.body.paymentRequirements?.network || "unknown",
    req.body.paymentRequirements?.scheme || "unknown",
    requestId
  );

  try {
    const body: SettleRequest = req.body;
    const paymentRequirements = PaymentRequirementsSchema.parse(
      body.paymentRequirements
    );
    const paymentPayload = PaymentPayloadSchema.parse(body.paymentPayload);

    let signer;
    if (SupportedEVMNetworks.includes(paymentRequirements.network as any)) {
      paymentLogger.client.evm(paymentRequirements.network, "create_signer");
      if (!EVM_PRIVATE_KEY) {
        throw new Error("EVM_PRIVATE_KEY required");
      }
      signer = await createSigner(
        paymentRequirements.network,
        EVM_PRIVATE_KEY as `0x${string}`
      );
    } else if (
      SupportedSVMNetworks.includes(paymentRequirements.network as any)
    ) {
      paymentLogger.client.svm(paymentRequirements.network, "create_signer");
      if (!SVM_PRIVATE_KEY) {
        throw new Error("SVM_PRIVATE_KEY required");
      }
      signer = await createSigner(paymentRequirements.network, SVM_PRIVATE_KEY);
    } else {
      throw new Error(`Unsupported network: ${paymentRequirements.network}`);
    }

    const result = await settle(signer, paymentPayload, paymentRequirements);
    const duration = Date.now() - startTime;
    paymentLogger.settle.success(
      paymentRequirements.network,
      duration,
      result.success,
      result.transaction,
      requestId
    );
    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    paymentLogger.settle.error(
      req.body.paymentRequirements?.network || "unknown",
      error,
      duration,
      requestId
    );
    res.status(400).json({ error: "Invalid request" });
  }
});

const PORT = parseInt(process.env.PORT || "3000");
app.listen(PORT, () => {
  systemLogger.startup(PORT);
});
