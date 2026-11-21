import { Suspense } from "react";

import { Spinner } from "@/components/game/status-note";

import { AdminGate } from "../../admin-gate";
import { HostConsole } from "./host-console";

export const metadata = {
  title: "Živá hra",
};

async function Resolve({
  params,
}: {
  params: PageProps<"/admin/play/[sessionId]">["params"];
}) {
  const { sessionId } = await params;

  return (
    <AdminGate>
      <HostConsole sessionId={sessionId} />
    </AdminGate>
  );
}

export default function HostPage(props: PageProps<"/admin/play/[sessionId]">) {
  return (
    <Suspense fallback={<Spinner label="Načítám hru…" />}>
      <Resolve params={props.params} />
    </Suspense>
  );
}
