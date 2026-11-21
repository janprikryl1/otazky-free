import { Suspense } from "react";

import { Spinner } from "@/components/game/status-note";

import { AdminGate } from "./admin-gate";
import { QuizList } from "./quiz-list";

export default function AdminPage() {
  return (
    <Suspense fallback={<Spinner label="Načítám…" />}>
      <AdminGate>
        <QuizList />
      </AdminGate>
    </Suspense>
  );
}
