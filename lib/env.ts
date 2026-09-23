import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORTAL_USERNAME: z.string().min(1),
  PORTAL_PASSWORD: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.url(),
  GOOGLE_CRUX_API_KEY: z.string().min(1),
  TOKEN_ENCRYPTION_KEY: z.string().min(1),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && value.PORTAL_PASSWORD === "admin") {
    ctx.addIssue({ code: "custom", path: ["PORTAL_PASSWORD"], message: "PORTAL_PASSWORD must be changed in production" });
  }
});

export type Env = z.infer<typeof schema>;
export function parseEnv(input: Record<string, unknown>): Env { return schema.parse(input); }
export function getEnv(): Env { return parseEnv(process.env); }
