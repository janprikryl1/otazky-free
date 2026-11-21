import type { ReactNode } from "react";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import { LoginForm } from "./login-form";

/**
 * Reads the moderator cookie, so it must always sit inside <Suspense>
 * (Cache Components treats cookies as request-time data).
 */
export async function AdminGate({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
