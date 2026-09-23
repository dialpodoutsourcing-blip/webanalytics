"use client";
import { FormEvent, useState } from "react";
export function LoginForm() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
    // A hard navigation ensures the newly issued HTTP-only cookie reaches the server layout.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (response.ok) { window.location.assign("/"); } else { setError("Invalid username or password."); setBusy(false); }
  }
  return <form onSubmit={submit} className="login-form"><label>Username<input name="username" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="error">{error}</p>}<button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form>;
}
