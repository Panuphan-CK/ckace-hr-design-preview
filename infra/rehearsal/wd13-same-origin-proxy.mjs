/** WD-11/WD-13 isolated, loopback-only TEST origin for browser QA.
 * Routes current candidate Web and existing TEST API under one temporary localhost origin.
 * This is NOT a deployment, Firebase rewrite, or Production proxy. No credentials are stored.
 */
import { createServer } from "node:http";
import { Readable } from "node:stream";

const WEB_HOST = /^(?:wd11-candidate|wd13-medical|wd13-retry|task35-responsive)---ckace-hr-web-test-[a-z0-9-]+\.a\.run\.app$/;
const API_HOST = /^(?:ckace-hr-api-test-[a-z0-9-]+|task28-attest---ckace-hr-api-test-[a-z0-9-]+|task30-uat---ckace-hr-api-test-[a-z0-9-]+|task32-r2---ckace-hr-api-test-[a-z0-9-]+)\.a\.run\.app$/;

export function validateTargets(webValue, apiValue) {
  const web = new URL(webValue);
  const api = new URL(apiValue);
  if (
    web.protocol !== "https:" ||
    api.protocol !== "https:" ||
    !WEB_HOST.test(web.hostname) ||
    !API_HOST.test(api.hostname) ||
    web.pathname !== "/" ||
    api.pathname !== "/" ||
    web.search || api.search ||
    web.username || web.password || api.username || api.password
  ) {
    throw new Error("WD13 proxy accepts only approved CKACE TEST candidate Web and TEST API URLs");
  }
  return { web: web.origin, api: api.origin };
}

export function targetForPath(path, targets) {
  if (path === "/api" || path.startsWith("/api/")) return targets.api;
  return targets.web;
}

export function createWd13Proxy(targets, fetcher = fetch) {
  return createServer(async (req, res) => {
    try {
      const incoming = new URL(req.url ?? "/", "http://127.0.0.1");
      if (incoming.pathname.startsWith("/__proxy")) {
        res.writeHead(404); res.end(); return;
      }
      const upstream = targetForPath(incoming.pathname, targets);
      const url = new URL(incoming.pathname + incoming.search, upstream);
      const headers = new Headers();
      for (const key of ["accept", "content-type", "cookie", "user-agent", "if-none-match", "if-modified-since", "range", "x-request-id"]) {
        const value = req.headers[key];
        if (typeof value === "string") headers.set(key, value);
      }
      headers.set("accept-encoding", "identity");
      const withBody = !["GET", "HEAD"].includes(req.method ?? "GET");
      const result = await fetcher(url, {
        method: req.method,
        headers,
        body: withBody ? Readable.toWeb(req) : undefined,
        ...(withBody ? { duplex: "half" } : {}),
        redirect: "manual",
      });
      const outbound = {};
      for (const [key, value] of result.headers) {
        if (["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"].includes(key)) continue;
        outbound[key] = value;
      }
      const cookies = result.headers.getSetCookie?.() ?? [];
      if (cookies.length) outbound["set-cookie"] = cookies;
      if (result.status >= 300 && result.status < 400 && outbound.location) {
        for (const origin of [targets.web, targets.api]) {
          if (outbound.location.startsWith(origin)) {
            outbound.location = outbound.location.slice(origin.length) || "/";
          }
        }
      }
      res.writeHead(result.status, outbound);
      if (!result.body) res.end();
      else Readable.fromWeb(result.body).pipe(res);
    } catch {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end("TEST upstream unavailable");
    }
  });
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const targets = validateTargets(
    process.env.WD13_TEST_WEB_URL ?? process.argv[2] ?? "https://wd11-candidate---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
    process.env.WD13_TEST_API_URL ?? process.argv[3] ?? "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app",
  );
  const port = Number(process.env.WD13_PROXY_PORT ?? "4198");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid loopback port");
  createWd13Proxy(targets).listen(port, "127.0.0.1", () => {
    process.stdout.write(`WD13_TEST_LOOPBACK_READY http://127.0.0.1:${port} isolated TEST upstreams; no production routing\n`);
  });
}
