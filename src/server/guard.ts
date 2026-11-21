import { isAdminAuthenticated } from "@/lib/admin-auth";
import { ApiError } from "@/lib/api";

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new ApiError("Nejsi přihlášený jako moderátor.", 401);
  }
}
