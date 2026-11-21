import { Suspense } from "react";

import { Spinner } from "@/components/game/status-note";

import { AdminGate } from "../../admin-gate";
import { QuizEditor } from "./quiz-editor";

export const metadata = {
  title: "Editor kvízu",
};

async function Resolve({
  params,
}: {
  params: PageProps<"/admin/quizzes/[quizId]">["params"];
}) {
  const { quizId } = await params;

  return (
    <AdminGate>
      <QuizEditor quizId={quizId} />
    </AdminGate>
  );
}

export default function QuizEditorPage(
  props: PageProps<"/admin/quizzes/[quizId]">,
) {
  return (
    <Suspense fallback={<Spinner label="Načítám…" />}>
      <Resolve params={props.params} />
    </Suspense>
  );
}
