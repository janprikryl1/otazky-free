import { Suspense } from "react";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import { AdminMenu } from "./admin-menu";

async function AdminMenuSlot() {
  if (!(await isAdminAuthenticated())) return null;
  return <AdminMenu />;
}

export const metadata = {
  title: "Moderátor",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/*
        The menu floats rather than sitting in a bar, because the live game
        is projected. Pages keep their own top-left corner clear with
        `pl-12` and add their own items via `useAdminMenuActions`.

        This layout stays server-only: a client component around `children`
        would break delivery of postponed boundaries inside the pages.
      */}
      <Suspense fallback={null}>
        <AdminMenuSlot />
      </Suspense>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-4">
        {children}
      </div>
    </div>
  );
}
