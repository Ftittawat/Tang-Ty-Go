import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSystemAdmin, sessionFromHeaders } from "@/lib/auth";
import { boardsForUser, type MyBoard } from "@/lib/db";
import type { Board, Role } from "@/lib/trips";

/** Remembers which of the user's boards is open; only trusted after checking membership. */
export const BOARD_COOKIE = "tg_board";

export type Viewer = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  /** In ADMIN_EMAILS: can create boards and see every board. */
  isSystemAdmin: boolean;
};

export type BoardContext = {
  viewer: Viewer;
  board: Board;
  /** The viewer's own name on this board. */
  me: { id: number; name: string; role: Role };
  boards: MyBoard[];
};

/** The signed-in Google user for this request (deduped per request), or null. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const s = await sessionFromHeaders(await headers());
  if (!s) return null;
  const { id, name, email, image } = s.user;
  return { userId: id, name, email, image: image ?? null, isSystemAdmin: isSystemAdmin(email) };
});

/** The open board (cookie, else the first one joined), or null when the user hasn't joined any. */
export const getBoardContext = cache(async (): Promise<BoardContext | null> => {
  const viewer = await getViewer();
  if (!viewer) return null;
  const boards = boardsForUser(viewer.userId);
  const wanted = Number((await cookies()).get(BOARD_COOKIE)?.value);
  const cur = boards.find((b) => b.id === wanted) ?? boards[0];
  if (!cur) return null;
  return {
    viewer,
    board: { id: cur.id, name: cur.name, code: cur.code },
    me: { id: cur.member_id, name: cur.member_name, role: cur.role },
    boards,
  };
});

/** Call at the top of every Server Action: actions are public endpoints. */
export async function requireAuth() {
  const v = await getViewer();
  if (!v) throw new Error("Unauthorized");
  return v;
}

export async function requireBoard() {
  const ctx = await getBoardContext();
  if (!ctx) throw new Error("No board");
  return ctx;
}

export async function requireBoardAdmin() {
  const ctx = await requireBoard();
  if (ctx.me.role !== "admin") throw new Error("Forbidden");
  return ctx;
}

/** For pages: sends people without a board to /join. */
export async function boardPage() {
  const ctx = await getBoardContext();
  if (ctx) return ctx;
  redirect((await getViewer()) ? "/join" : "/login");
}
