import type { PublicError } from "./errors";
export type ApiResult<T> = { ok: true; data: T; stale?: boolean } | { ok: false; error: PublicError };
