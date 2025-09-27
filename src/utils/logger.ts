import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use to print out messages
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),
  // File transport for errors
  new DailyRotateFile({
    filename: "logs/error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),
  // File transport for all logs
  new DailyRotateFile({
    filename: "logs/combined-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),
  // File transport for HTTP requests
  new DailyRotateFile({
    filename: "logs/http-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "http",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "7d",
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  transports,
  exitOnError: false,
});

// Create a stream object with a 'write' function that will be used by Morgan
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Payment-specific logging methods
export const paymentLogger = {
  verify: {
    start: (network: string, scheme: string, requestId?: string) => {
      logger.info("Payment verification started", {
        operation: "verify",
        network,
        scheme,
        requestId,
        timestamp: new Date().toISOString(),
      });
    },
    success: (
      network: string,
      duration: number,
      isValid: boolean,
      requestId?: string
    ) => {
      logger.info("Payment verification completed", {
        operation: "verify",
        network,
        duration,
        isValid,
        requestId,
        timestamp: new Date().toISOString(),
      });
    },
    error: (
      network: string,
      error: any,
      duration: number,
      requestId?: string
    ) => {
      logger.error("Payment verification failed", {
        operation: "verify",
        network,
        error: error.message || error,
        duration,
        requestId,
        timestamp: new Date().toISOString(),
      });
    },
  },
  settle: {
    start: (network: string, scheme: string, requestId?: string) => {
      logger.info("Payment settlement started", {
        operation: "settle",
        network,
        scheme,
        requestId,
        timestamp: new Date().toISOString(),
      });
    },
    success: (
      network: string,
      duration: number,
      success: boolean,
      transaction?: string,
      requestId?: string
    ) => {
      logger.info("Payment settlement completed", {
        operation: "settle",
        network,
        duration,
        success,
        transaction,
        requestId,
        timestamp: new Date().toISOString(),
      });
    },
    error: (
      network: string,
      error: any,
      duration: number,
      requestId?: string
    ) => {
      logger.error("Payment settlement failed", {
        operation: "settle",
        network,
        error: error.message || error,
        duration,
        requestId,
        timestamp: new Date().toISOString(),
      });
    },
  },
  client: {
    evm: (network: string, action: string) => {
      logger.debug("EVM client operation", {
        operation: "client",
        type: "evm",
        network,
        action,
        timestamp: new Date().toISOString(),
      });
    },
    svm: (network: string, action: string) => {
      logger.debug("SVM client operation", {
        operation: "client",
        type: "svm",
        network,
        action,
        timestamp: new Date().toISOString(),
      });
    },
  },
};

// System logging methods
export const systemLogger = {
  startup: (port: number) => {
    logger.info("x402 Facilitator Server started", {
      operation: "startup",
      port,
      timestamp: new Date().toISOString(),
    });
  },
  health: () => {
    logger.debug("Health check requested", {
      operation: "health",
      timestamp: new Date().toISOString(),
    });
  },
  supported: () => {
    logger.debug("Supported networks requested", {
      operation: "supported",
      timestamp: new Date().toISOString(),
    });
  },
};

export default logger;
