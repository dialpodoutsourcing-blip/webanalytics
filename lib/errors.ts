export type AppErrorCode =
  | "AUTH_REQUIRED" | "GOOGLE_NOT_CONNECTED" | "GOOGLE_REAUTH_REQUIRED"
  | "PROPERTY_FORBIDDEN" | "INVALID_INPUT" | "NO_DATA"
  | "QUOTA_EXCEEDED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR";

const publicMessages: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: "Please sign in to continue.",
  GOOGLE_NOT_CONNECTED: "Connect Google to continue.",
  GOOGLE_REAUTH_REQUIRED: "Reconnect Google to continue.",
  PROPERTY_FORBIDDEN: "You do not have access to that property.",
  INVALID_INPUT: "Check the information and try again.",
  NO_DATA: "No data is available for this selection.",
  QUOTA_EXCEEDED: "Google API quota has been reached. Try again later.",
  UPSTREAM_UNAVAILABLE: "Google data is temporarily unavailable.",
  INTERNAL_ERROR: "Something went wrong.",
};

export class AppError extends Error {
  constructor(public code: AppErrorCode, message?: string, public retryable = false, options?: ErrorOptions) {
    super(message ?? publicMessages[code], options);
    this.name = "AppError";
  }
}

export type PublicError = { code: AppErrorCode; message: string };
export function toPublicError(error: unknown): PublicError {
  const code = error instanceof AppError ? error.code : "INTERNAL_ERROR";
  return { code, message: publicMessages[code] };
}
