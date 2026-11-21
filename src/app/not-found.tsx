import { CompassIcon, HomeIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Stránka nenalezena",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <CompassIcon className="size-7" />
          </span>
          <CardTitle>Taková stránka tu není</CardTitle>
          <CardDescription>
            Zkontroluj prosím adresu. Do hry se dostaneš zadáním PINu na úvodní
            stránce.
          </CardDescription>
        </CardHeader>

        <Button asChild size="lg">
          <Link href="/">
            <HomeIcon />
            Na úvodní stránku
          </Link>
        </Button>
      </Card>
    </main>
  );
}
