import { db } from "@/lib/db";
import type { Plan, PlanItem } from "@/lib/plans";

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

export type PlanSummary = Plan & { activity_count: number };
export type PlanInput = Pick<Plan, "title" | "trip_id" | "start_date" | "day_count" | "note">;
export type ItemInput = Omit<PlanItem, "id" | "plan_id" | "position">;

export function listPlans(): PlanSummary[] {
  return db()
    .prepare(`
      SELECT p.*, (SELECT COUNT(*) FROM plan_items i WHERE i.plan_id = p.id AND i.kind = 'activity') AS activity_count
      FROM plans p
      ORDER BY (p.start_date IS NULL), p.start_date, p.updated_at DESC
    `)
    .all() as PlanSummary[];
}

export function getPlan(id: number) {
  return db().prepare("SELECT * FROM plans WHERE id = ?").get(id) as Plan | undefined;
}

export function getItems(planId: number) {
  return db()
    .prepare("SELECT * FROM plan_items WHERE plan_id = ? ORDER BY day, position, id")
    .all(planId) as PlanItem[];
}

export function firstPlanForTrip(tripId: number) {
  return db().prepare("SELECT id FROM plans WHERE trip_id = ? ORDER BY id LIMIT 1").get(tripId) as
    { id: number } | undefined;
}

export function createPlan(input: PlanInput) {
  return Number(
    db()
      .prepare("INSERT INTO plans (title, trip_id, start_date, day_count, note) VALUES (@title, @trip_id, @start_date, @day_count, @note)")
      .run(input).lastInsertRowid,
  );
}

export function updatePlan(id: number, input: PlanInput) {
  db()
    .prepare(`
      UPDATE plans SET title = @title, trip_id = @trip_id, start_date = @start_date, day_count = @day_count,
        note = @note, updated_at = ${NOW}
      WHERE id = @id
    `)
    .run({ ...input, id });
}

export function deletePlan(id: number) {
  db().prepare("DELETE FROM plans WHERE id = ?").run(id);
}

/** Highest day that still has items — the plan can't shrink below it. */
export function lastUsedDay(planId: number) {
  const r = db().prepare("SELECT MAX(day) AS d FROM plan_items WHERE plan_id = ?").get(planId) as { d: number | null };
  return r.d ?? 0;
}

const touch = (planId: number) => db().prepare(`UPDATE plans SET updated_at = ${NOW} WHERE id = ?`).run(planId);

export function getItem(id: number) {
  return db().prepare("SELECT * FROM plan_items WHERE id = ?").get(id) as PlanItem | undefined;
}

function nextPosition(planId: number, day: number) {
  const r = db().prepare("SELECT MAX(position) AS p FROM plan_items WHERE plan_id = ? AND day = ?").get(planId, day) as
    { p: number | null };
  return (r.p ?? -1) + 1;
}

/** Adds an item at the end of its day, or right before `beforeId` (same day) when given. */
export function createItem(planId: number, input: ItemInput, beforeId?: number) {
  const d = db();
  return d.transaction(() => {
    const before = beforeId ? getItem(beforeId) : undefined;
    let position: number;
    let day = input.day;
    if (before && before.plan_id === planId) {
      day = before.day;
      position = before.position;
      d.prepare("UPDATE plan_items SET position = position + 1 WHERE plan_id = ? AND day = ? AND position >= ?")
        .run(planId, day, position);
    } else {
      position = nextPosition(planId, day);
    }
    const id = d
      .prepare(`
        INSERT INTO plan_items (plan_id, day, position, kind, title, details, location, start_time, duration_min, travel_mode)
        VALUES (@plan_id, @day, @position, @kind, @title, @details, @location, @start_time, @duration_min, @travel_mode)
      `)
      .run({ ...input, plan_id: planId, day, position }).lastInsertRowid;
    touch(planId);
    return Number(id);
  })();
}

export function updateItem(id: number, input: ItemInput) {
  const d = db();
  d.transaction(() => {
    const cur = getItem(id);
    if (!cur) return;
    // Moving to another day puts the item at the end of that day.
    const position = cur.day === input.day ? cur.position : nextPosition(cur.plan_id, input.day);
    d.prepare(`
      UPDATE plan_items SET day = @day, position = @position, kind = @kind, title = @title, details = @details,
        location = @location, start_time = @start_time, duration_min = @duration_min, travel_mode = @travel_mode
      WHERE id = @id
    `).run({ ...input, position, id });
    touch(cur.plan_id);
  })();
}

/** Swap with the neighbour above (-1) or below (+1) in the same day. */
export function moveItem(id: number, dir: -1 | 1) {
  const d = db();
  d.transaction(() => {
    const cur = getItem(id);
    if (!cur) return;
    const neighbour = d
      .prepare(`
        SELECT * FROM plan_items WHERE plan_id = ? AND day = ? AND position ${dir < 0 ? "<" : ">"} ?
        ORDER BY position ${dir < 0 ? "DESC" : "ASC"} LIMIT 1
      `)
      .get(cur.plan_id, cur.day, cur.position) as PlanItem | undefined;
    if (!neighbour) return;
    const set = d.prepare("UPDATE plan_items SET position = ? WHERE id = ?");
    set.run(neighbour.position, cur.id);
    set.run(cur.position, neighbour.id);
    touch(cur.plan_id);
  })();
}

export function deleteItem(id: number) {
  const cur = getItem(id);
  if (!cur) return;
  db().prepare("DELETE FROM plan_items WHERE id = ?").run(id);
  touch(cur.plan_id);
}
