import { expect, it } from "vitest";
import { AppError, toPublicError } from "@/lib/errors";

it("hides upstream details from quota errors", () => {
  expect(toPublicError(new AppError("QUOTA_EXCEEDED", "raw detail"))).toEqual({
    code: "QUOTA_EXCEEDED",
    message: "Google API quota has been reached. Try again later.",
  });
});
