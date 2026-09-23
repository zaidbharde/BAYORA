import "dotenv/config";

export interface ApiConfig {
  host: string;
  port: number;
  nodeEnv: "development" | "test" | "production";
  corsOrigin: string;
}

const parsePort = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid API_PORT value: ${value}`);
  }

  return parsed;
};

const parseNodeEnv = (value: string | undefined): ApiConfig["nodeEnv"] => {
  if (value === "production" || value === "test" || value === "development") {
    return value;
  }

  return "development";
};

export const getApiConfig = (): ApiConfig => ({
  host: process.env.API_HOST ?? "127.0.0.1",
  port: parsePort(process.env.API_PORT, 4000),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173"
});

