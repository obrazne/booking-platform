// Speed of the property page on a phone (Z16): LCP, transferred bytes and requests with a throttled "4G" network and
// 4× slower CPU — like Lighthouse mobile. Usage: node scripts/perf-check.mjs [url]
import { chromium, devices } from "@playwright/test";

const url = process.argv[2] ?? "http://ukazka.localhost:3100/p/chalet-pod-smrekom";
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["Pixel 7"] });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
let bytes = 0;
let requests = 0;
const images = [];
cdp.on("Network.loadingFinished", (e) => {
  bytes += e.encodedDataLength;
  requests += 1;
});
cdp.on("Network.responseReceived", (e) => {
  if (e.type === "Image") images.push(`${e.response.mimeType} ${e.response.url.slice(0, 90)}`);
});
await page.addInitScript(() => {
  window.__lcp = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__lcp = e.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
});
const t0 = Date.now();
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(1500);
const lcp = await page.evaluate(() => window.__lcp);
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType("navigation")[0];
  return {
    ttfb: Math.round(n.responseStart),
    domContentLoaded: Math.round(n.domContentLoadedEventEnd),
  };
});
console.log(
  JSON.stringify(
    {
      url,
      lcpMs: Math.round(lcp),
      ...nav,
      loadMs: Date.now() - t0,
      transferredKB: Math.round(bytes / 1024),
      requests,
      images: images.slice(0, 8),
    },
    null,
    1,
  ),
);
await browser.close();
