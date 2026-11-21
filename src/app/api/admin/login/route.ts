import { setAdminCookie, verifyPassword } from "@/lib/admin-auth";
import { ApiError, asRecord, readJson, withApi } from "@/lib/api";

export async function POST(request: Request) {
  return withApi(async () => {
    const body = asRecord(await readJson(request));

    if (!verifyPassword(body.password)) {
      throw new ApiError("Nesprávné heslo.", 401);
    }

    await setAdminCookie();

    return { ok: true };
  });
}
