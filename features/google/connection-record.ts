import { z } from "zod";

const connectionRecordSchema = z.object({
  version: z.literal(1),
  refreshTokenEncrypted: z.string().min(1),
  accountEmail: z.string().email().optional(),
  scope: z.string().min(1).optional(),
  connectedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type SharedGoogleConnection = z.infer<typeof connectionRecordSchema>;

export function parseConnectionRecord(value: unknown): SharedGoogleConnection {
  return connectionRecordSchema.parse(value);
}
