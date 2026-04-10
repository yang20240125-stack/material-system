import { headers } from "next/headers";

export async function getRequestUser() {
  const h = await headers();
  const userId = h.get("x-user-id");
  const role = h.get("x-user-role") as "USER" | "ADMIN" | null;
  const name = h.get("x-user-name");

  if (!userId || !role) {
    return null;
  }

  return {
    userId,
    role,
    name: name ? decodeURIComponent(name) : "",
  };
}

export function requireAdmin(user: { role: string } | null) {
  if (!user || user.role !== "ADMIN") {
    return false;
  }
  return true;
}
