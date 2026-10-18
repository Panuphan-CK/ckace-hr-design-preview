/**
 * The Next.js router changes the URL hash with history.pushState, which never fires `hashchange`.
 * The desktop pages pick their view from the hash, so this makes the router's hash changes
 * dispatch the same event a normal link click would.
 */
let installed = false;

export function installHashChangeEvents(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function patched(this: History, ...args: Parameters<History["pushState"]>) {
      const before = window.location.hash;
      const result = original.apply(this, args);
      if (window.location.hash !== before) {
        window.dispatchEvent(new Event("hashchange"));
      }
      return result;
    };
  }
}
