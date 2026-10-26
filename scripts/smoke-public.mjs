#!/usr/bin/env node
// Non-destructive public smoke test. No account creation, email, or payment.
const base = process.env.ENCAIR_BASE_URL;
if (!base) {
  console.error("Set ENCAIR_BASE_URL to an explicit staging URL.");
  process.exit(2);
}
let origin;
try {
  const url = new URL(base);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw Error("HTTPS required");
  if (url.username || url.password || url.search || url.hash) throw Error("Use a clean base URL");
  origin = url.origin;
} catch (error) {
  console.error("Invalid ENCAIR_BASE_URL:", error.message);
  process.exit(2);
}
const routes = ["/", "/auth/register", "/auth/login", "/auth/forgot-password", "/mentions-legales", "/privacy", "/cgu"];
let failed = 0;
for (const route of routes) {
  const target = new URL(route, origin);
  try {
    const response = await fetch(target, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Encair-Staging-Smoke/1.0" }
    });
    const location = response.headers.get("location");
    const redirect = location ? new URL(location, target) : null;
    const ok = response.status === 200 && !redirect;
    console.log(`${ok ? "PASS" : "FAIL"} ${route} HTTP ${response.status}${redirect ? ` -> ${redirect.origin}${redirect.pathname}` : ""}`);
    if (!ok) failed++;
  } catch (error) {
    console.error(`FAIL ${route}: ${error.message}`);
    failed++;
  }
}
if (failed) {
  console.error(`${failed} public route(s) failed. Do not approve release based on this smoke test.`);
  process.exitCode = 1;
} else {
  console.log("Public pages reachable. Auth, RLS, Resend, Stripe, cron and real customer flows still require separate E2E verification.");
}
