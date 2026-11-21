import type { ReactNode } from "react";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import { LoginForm } from "./login-form";

/**
 * Server component – ověří moderátorskou cookie. Musí být vždy obalený
 * v <Suspense>, protože čte data požadavku (Cache Components).
 */
export async function AdminGate({ children }: { children: ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
