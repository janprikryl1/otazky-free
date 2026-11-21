import { PartyPopperIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";

import { JoinByPin } from "@/app/join-by-pin";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 py-10">
      <ThemeToggle />
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/20 text-primary">
          <PartyPopperIcon className="size-9" />
        </span>

        <h1 className="text-balance-cs font-black text-4xl text-festive leading-tight tracking-tight">
          Narozeninový kvíz
        </h1>

        <p className="text-balance-cs text-muted-foreground">
          Zadej PIN hry, který vidíš na velké obrazovce, a hraj s námi z
          vlastního telefonu.
        </p>
      </header>

      <JoinByPin />

      <footer className="flex justify-center">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-lg px-3 py-2 font-semibold text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <SettingsIcon className="size-4" />
          Jsem moderátor
        </Link>
      </footer>
    </main>
  );
}
