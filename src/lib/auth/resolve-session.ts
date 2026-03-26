import { getSession } from "@/lib/session";

export type ResolvedSessionUser = {
  userId: string;
  figmaUserId: string;
};

export async function resolveSessionUser(
  sessionToken: string
): Promise<ResolvedSessionUser | null> {
  if (typeof sessionToken !== "string") {
    return null;
  }

  if (sessionToken.trim() === "") {
    return null;
  }

  const session = await getSession(sessionToken);

  if (!session) {
    return null;
  }

  if (!session.figmaUserId) {
    return null;
  }

  return {
    userId: session.figmaUserId,
    figmaUserId: session.figmaUserId
  };
}