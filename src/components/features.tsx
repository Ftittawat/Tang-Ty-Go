"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_FEATURES, type FeatureState } from "@/lib/features";

const FeaturesContext = createContext<FeatureState>(DEFAULT_FEATURES);

/**
 * Hands the switches in effect (open board's overrides, else the whole app's) to client components.
 * Only decides what to show: every page and Server Action checks the switch again on the server.
 */
export function FeaturesProvider({ value, children }: { value: FeatureState; children: ReactNode }) {
  return <FeaturesContext value={value}>{children}</FeaturesContext>;
}

export const useFeatures = () => useContext(FeaturesContext);
