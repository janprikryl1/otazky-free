"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { apiSend } from "@/lib/fetcher";

export function LogoutButton() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isSending}
      onClick={async () => {
        setIsSending(true);
        try {
          await apiSend("/api/admin/logout");
          router.replace("/admin");
          router.refresh();
        } finally {
          setIsSending(false);
        }
      }}
    >
      <LogOutIcon />
      Odhlásit
    </Button>
  );
}
