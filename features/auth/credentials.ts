import { timingSafeEqual } from "node:crypto";

function equal(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyPortalCredentials(username: string, password: string, configured: { username: string; password: string }) {
  return equal(username, configured.username) && equal(password, configured.password);
}
