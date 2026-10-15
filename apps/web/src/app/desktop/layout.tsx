import type { ReactNode } from "react";

import { DesktopShell } from "./desktop-shell";

export default function DesktopLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <DesktopShell>{children}</DesktopShell>;
}
