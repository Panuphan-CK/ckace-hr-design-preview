/** WD-13 desktop UI capability browser fixture (NOT genuine authentication/RBAC UAT).
 * Loopback-only. Serves actual tagged TEST Web assets; intercepts ALL /api/* locally.
 * No DB credentials, data mutation, secret manager, Firebase routing or production traffic.
 */
import { createWd13Proxy, validateTargets } from "./wd13-same-origin-proxy.mjs";

const web = "https://wd11-candidate---ckace-hr-web-test-cjcyhgow2q-as.a.run.app";
const api = "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
const targets = validateTargets(web, api);
const apiOrigin = targets.api;
const all = [
  "leave", "requestStatus", "approvals", "attendance", "overtime",
  "medical", "benefits", "announcements", "notifications", "profile",
  "onboarding", "announcementAdmin", "adminSettings", "admin",
];
const self = [
  "leave", "requestStatus", "attendance", "overtime",
  "medical", "benefits", "announcements", "profile",
];
const profiles = Object.freeze({
  employee: self,
  superuser: [...self, "approvals"],
  admin: [...self, "approvals", "notifications", "onboarding", "announcementAdmin", "admin"],
  superadmin: all,
});
export function navigation(role) {
  if (!Object.hasOwn(profiles, role)) throw new Error("Unknown QA role");
  return Object.fromEntries(all.map(name => [name, profiles[role].includes(name)]));
}
export function fixtureResponse(url, init) {
  const target = new URL(String(url));
  if (target.origin !== apiOrigin) return null;
  const cookie = new Headers(init?.headers).get("cookie") ?? "";
  const role = cookie.match(/(?:^|;)\s*wd13_qa_role=(employee|superuser|admin|superadmin)(?:;|$)/)?.[1] ?? "employee";
  if (target.pathname === "/api/security/session" && (!init?.method || init.method === "GET")) {
    return new Response(JSON.stringify({
      authenticated: true, employeeId: "00000000-0000-4000-8000-00000000000a",
      navigation: navigation(role),
    }), { status: 200, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store" } });
  }
  if (target.pathname === "/api/desktop-auth/logout" && init?.method === "POST") {
    return new Response(JSON.stringify({ loggedOut:true }), {
      status:200,headers:{"content-type":"application/json","set-cookie":"wd13_qa_role=; Max-Age=0; Path=/; SameSite=Strict"},
    });
  }
  // Deliberate fail-closed: never forward other API calls (including any POST) to TEST.
  return new Response(JSON.stringify({ error:"WD13_LOCAL_MOCK_ONLY", detail:"Not a real authenticated API result" }), {
    status:403,headers:{"content-type":"application/json","cache-control":"no-store"},
  });
}
export function startMockServer(port = 4199) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("invalid port");
  const server = createWd13Proxy(targets, (url, init) => fixtureResponse(url, init) ?? fetch(url, init));
  server.listen(port, "127.0.0.1", () => process.stdout.write(`WD13_LOCAL_UI_FIXTURE_READY 127.0.0.1:${port}; API ALL MOCKED, NO REAL AUTH\n`));
  return server;
}
if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) startMockServer();
