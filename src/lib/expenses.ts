// Shared (client + server) expense types and the bill-splitting math.
// Money is always integer satang (1 บาท = 100) so splits add up exactly.

export type Expense = {
  id: number;
  trip_id: number;
  title: string;
  amount: number; // satang
  payer_id: number | null;
  split_all: boolean; // หารเท่าทุกคนในทริป (follows the trip's people list)
  share_ids: number[]; // used when split_all is false
  created_at: string;
};

export const EXPENSE_TITLE_MAX = 120;
export const AMOUNT_MAX = 100_000_000 * 100;

/** "1,567.50" / "฿ 300" → satang, null if empty, NaN if not a valid positive amount. */
export function parseAmount(raw: string) {
  const s = raw.replace(/[,\s฿]/g, "");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

/** satang → "1,567.50" (no decimals when whole baht). */
export function formatBaht(satang: number) {
  const whole = satang % 100 === 0;
  return (satang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** satang → "1,567.50" for an input's defaultValue (no thousands separator). */
export const amountInput = (satang: number) => (satang % 100 === 0 ? String(satang / 100) : (satang / 100).toFixed(2));

/** Who splits this expense: everyone in the pool, or the ticked people. */
export const sharersOf = (e: Expense, pool: number[]) => (e.split_all ? pool : e.share_ids);

/**
 * Equal split in satang. Leftover satang go one each to the first sharers (by id),
 * so the parts always add back up to the amount.
 */
export function splitAmount(amount: number, sharers: number[]): Map<number, number> {
  const ids = [...new Set(sharers)].sort((a, b) => a - b);
  const out = new Map<number, number>();
  if (ids.length === 0) return out;
  const base = Math.floor(amount / ids.length);
  const extra = amount - base * ids.length;
  ids.forEach((id, i) => out.set(id, base + (i < extra ? 1 : 0)));
  return out;
}

export type Balance = {
  member_id: number;
  paid: number; // จ่ายไปแล้ว
  owed: number; // ส่วนที่ต้องจ่ายจริง
  net: number; // paid - owed: บวก = ได้คืน, ลบ = ต้องจ่ายเพิ่ม
};

export type Settlement = {
  total: number;
  balances: Balance[];
  /** Expenses nobody is splitting (or with no payer) — they can't be settled until fixed. */
  unsplit: number[];
  transfers: { from: number; to: number; amount: number }[];
};

export function settle(expenses: Expense[], pool: number[]): Settlement {
  const acc = new Map<number, Balance>();
  const get = (id: number) => {
    let b = acc.get(id);
    if (!b) acc.set(id, (b = { member_id: id, paid: 0, owed: 0, net: 0 }));
    return b;
  };
  for (const id of pool) get(id);

  const unsplit: number[] = [];
  let total = 0;
  for (const e of expenses) {
    total += e.amount;
    const parts = splitAmount(e.amount, sharersOf(e, pool));
    if (parts.size === 0 || e.payer_id === null) {
      unsplit.push(e.id);
      continue;
    }
    get(e.payer_id).paid += e.amount;
    for (const [id, part] of parts) get(id).owed += part;
  }

  const balances = [...acc.values()];
  for (const b of balances) b.net = b.paid - b.owed;

  return { total, balances, unsplit, transfers: minimalTransfers(balances) };
}

/** Greedy: biggest debtor pays biggest creditor until everyone is square. */
function minimalTransfers(balances: Balance[]) {
  const debtors = balances.filter((b) => b.net < 0).map((b) => ({ id: b.member_id, left: -b.net }));
  const creditors = balances.filter((b) => b.net > 0).map((b) => ({ id: b.member_id, left: b.net }));
  debtors.sort((a, b) => b.left - a.left);
  creditors.sort((a, b) => b.left - a.left);

  const out: Settlement["transfers"] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left === 0) i++;
    if (creditors[j].left === 0) j++;
  }
  return out;
}
