import { PartyPopperIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import { LogoutButton } from "./logout-button";

/** Odhlašovací tlačítko dává smysl jen přihlášenému moderátorovi. */
async function LogoutSlot() {
  if (!(await isAdminAuthenticated())) return null;
  return <LogoutButton />;
}

export const metadata = {
  title: "Moderátor",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-white/10 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="flex min-w-0 items-center gap-2 font-bold"
          >
            <PartyPopperIcon className="size-5 shrink-0 text-primary" />
            <span className="truncate">Narozeninový kvíz</span>
          </Link>

          <Suspense fallback={null}>
            <LogoutSlot />
          </Suspense>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5">
        {children}
      </div>
    </div>
  );
}
