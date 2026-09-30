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
  DATAFORSEO_LOGIN: z.string().min(1),
  DATAFORSEO_PASSWORD: z.string().min(1),
  GEOGRID_MAX_SCAN_USD: z.coerce.number().positive(),
  GEOGRID_WEEKLY_LIMIT_USD: z.coerce.number().positive(),
  GEOGRID_MONTHLY_LIMIT_USD: z.coerce.number().positive(),
  GEOGRID_SCHEDULER_SECRET: z.string().min(32),
  NEXT_PUBLIC_MAP_TILE_URL: z.url(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV === "production" && value.PORTAL_PASSWORD === "admin") {
    ctx.addIssue({ code: "custom", path: ["PORTAL_PASSWORD"], message: "PORTAL_PASSWORD must be changed in production" });
  }
  if (value.NODE_ENV === "production" && !value.DATABASE_URL.startsWith("postgresql://") && !value.DATABASE_URL.startsWith("postgres://")) {
    ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "DATABASE_URL must use PostgreSQL in production" });
  }
  if (value.NODE_ENV === "production" && !value.NEXT_PUBLIC_MAP_TILE_URL.startsWith("https://")) ctx.addIssue({ code: "custom", path: ["NEXT_PUBLIC_MAP_TILE_URL"], message: "Map tiles must use HTTPS in production" });
});

export type Env = z.infer<typeof schema>;
export function parseEnv(input: Record<string, unknown>): Env { return schema.parse(input); }
export function getEnv(): Env { return parseEnv(process.env); }
