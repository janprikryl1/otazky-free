import { clearAdminCookie } from "@/lib/admin-auth";
import { withApi } from "@/lib/api";

export async function POST() {
  return withApi(async () => {
    await clearAdminCookie();
    return { ok: true };
  });
}
