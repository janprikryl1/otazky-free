import { Suspense } from "react";

import { isAdminAuthenticated } from "@/lib/admin-auth";

import { AdminMenu } from "./admin-menu";

/** Nabídka dává smysl jen přihlášenému moderátorovi. */
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
        Nabídka je plovoucí, ne v pruhu nad obsahem – živá hra se promítá
        a vodorovný pruh by zbytečně ukrajoval plochu otázce. Stránky si
        proto uvolňují levý horní roh samy (třída `pl-12` na prvním řádku)
        a přes `useAdminMenuActions` si do nabídky přidávají vlastní akce.

        Layout zůstává čistě serverový: klientská komponenta kolem
        `children` by rozbila doručování odložených hranic uvnitř stránek.
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
