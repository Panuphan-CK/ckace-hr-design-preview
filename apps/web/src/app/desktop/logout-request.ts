// Logout is only confirmed when the cookie-clearing response succeeds.
// Network failures cannot establish whether the browser received Set-Cookie.
export async function requestDesktopLogout(
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher("/api/desktop-auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    return response.ok;
  } catch {
    return false;
  }
}
