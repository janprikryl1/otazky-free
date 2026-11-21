import { Suspense } from "react";

import { Spinner } from "@/components/game/status-note";

import { PlayerGame } from "./player-game";

export const metadata = {
  title: "Hra",
};

async function ResolvePin({
  params,
}: {
  params: PageProps<"/play/[pin]">["params"];
}) {
  const { pin } = await params;

  return <PlayerGame pin={pin} />;
}

export default function PlayPage(props: PageProps<"/play/[pin]">) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-5">
      <Suspense fallback={<Spinner label="Načítám hru…" />}>
        <ResolvePin params={props.params} />
      </Suspense>
    </main>
  );
}
