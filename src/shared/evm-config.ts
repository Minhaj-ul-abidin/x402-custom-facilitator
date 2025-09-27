import { Address } from "viem";

export type ChainConfig = {
  usdcAddress: Address;
  usdcName: string;
};

export const config: Record<string, ChainConfig> = {
  // Base Sepolia
  "84532": {
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdcName: "USDC",
  },
  // Base
  "8453": {
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcName: "USD Coin",
  },
  // Ethereum Mainnet
  "1": {
    usdcAddress: "0xA0b86a33E6441fe893a0C9893c9e1B9AcC79c3bF",
    usdcName: "USD Coin",
  },
  // Sepolia
  "11155111": {
    usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    usdcName: "USDC",
  },
  // Arbitrum
  "42161": {
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    usdcName: "USD Coin",
  },
  // Arbitrum Sepolia
  "421614": {
    usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    usdcName: "USDC",
  },
  // Optimism
  "10": {
    usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    usdcName: "USD Coin",
  },
  // Polygon
  "137": {
    usdcAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    usdcName: "USD Coin",
  },
  // Polygon Amoy
  "80002": {
    usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    usdcName: "USDC",
  },
  // Avalanche Fuji
  "43113": {
    usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65",
    usdcName: "USD Coin",
  },
  // Avalanche
  "43114": {
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcName: "USD Coin",
  },
};