// Production build + server for the Playwright tests (port 3100) with Cloudflare's public Turnstile TEST keys
// (always pass, documented at developers.cloudflare.com/turnstile/troubleshooting/testing). The real keys from
// .env.local would show a challenge to the automated browser. The site key is inlined at build time, so the build
// must run with it too. Usage: `npm run e2e:server`, then `npm run e2e` in another terminal. Another port:
// `E2E_PORT=3101 npm run e2e:server` and run the tests with E2E_GUEST_URL / E2E_ADMIN_URL pointing to it.
import { spawnSync, spawn } from "node:child_process";

const env = {
  ...process.env,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};
const port = String(Number(process.env.E2E_PORT ?? 3100));
const opts = { env, stdio: "inherit", shell: true };

const build = spawnSync("npm run build", opts);
if (build.status !== 0) process.exit(build.status ?? 1);
spawn(`npm start -- -p ${port}`, opts).on("exit", (code) => process.exit(code ?? 0));
