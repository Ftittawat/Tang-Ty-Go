/**
 * Switches the owner (ADMIN_EMAILS) can flip in /back-office. Plain data, safe for client components.
 * Only overrides are stored (feature_flags / board_features), so a new entry here shows up with its default.
 */

export type FeatureScope =
  /** One switch for the whole app. */
  | "global"
  /** A switch for the whole app that a single board can override. */
  | "board";

type FeatureDef = { label: string; description: string; default: boolean; scope: FeatureScope };

export const FEATURES = {
  maintenance: {
    label: "โหมดปิดปรับปรุง",
    description: "ทุกคนดูได้อย่างเดียว แก้ไขอะไรไม่ได้ (ยกเว้นเจ้าของระบบ) และมีแถบแจ้งบนทุกหน้า",
    default: false,
    scope: "global",
  },
  signup: {
    label: "สมัครสมาชิกใหม่",
    description: "บัญชี Google ที่ยังไม่เคยเข้าใช้ สมัครเข้าระบบได้ (คนที่เคยเข้าแล้วยังเข้าได้ตามปกติ)",
    default: true,
    scope: "global",
  },
  expenses: {
    label: "ค่าใช้จ่าย / หารบิล",
    description: "หน้าจดค่าใช้จ่ายของทริป และคิดว่าใครต้องโอนให้ใคร",
    default: true,
    scope: "board",
  },
  plans: {
    label: "แผนเที่ยว",
    description: "แท็บแผนเที่ยว และแผนรายวันของแต่ละทริป",
    default: true,
    scope: "board",
  },
  calendar_export: {
    label: "Add to Calendar",
    description: "ปุ่มเพิ่มทริปลงใน Google Calendar บนการ์ดทริป",
    default: true,
    scope: "board",
  },
} as const satisfies Record<string, FeatureDef>;

export type FeatureKey = keyof typeof FEATURES;
export type BoardFeatureKey = { [K in FeatureKey]: (typeof FEATURES)[K]["scope"] extends "board" ? K : never }[FeatureKey];
export type FeatureState = Record<FeatureKey, boolean>;

export const FEATURE_KEYS = Object.keys(FEATURES) as FeatureKey[];
export const BOARD_FEATURE_KEYS = FEATURE_KEYS.filter((k): k is BoardFeatureKey => FEATURES[k].scope === "board");

export const isFeatureKey = (v: unknown): v is FeatureKey => typeof v === "string" && v in FEATURES;
export const isBoardFeatureKey = (v: unknown): v is BoardFeatureKey => isFeatureKey(v) && FEATURES[v].scope === "board";

export const DEFAULT_FEATURES = Object.fromEntries(FEATURE_KEYS.map((k) => [k, FEATURES[k].default])) as FeatureState;

export const MAINTENANCE_MESSAGE = "ระบบปิดปรับปรุงชั่วคราว ตอนนี้ดูได้อย่างเดียว";
export const featureOffMessage = (key: FeatureKey) => `“${FEATURES[key].label}” ถูกปิดใช้งานอยู่`;
