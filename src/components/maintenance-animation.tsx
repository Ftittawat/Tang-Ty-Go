"use client";

import { useEffect, useRef } from "react";

/**
 * "Maintenance web" by Creanimasi Studio (LottieFiles, Lottie Simple License), its images inlined
 * into maintenance-animation.json. Player and data load only on this page; with reduced motion
 * it shows a still frame.
 */
export function MaintenanceAnimation({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    Promise.all([import("lottie-web/build/player/lottie_light"), import("./maintenance-animation.json")]).then(
      ([{ default: lottie }, { default: animationData }]) => {
        if (cancelled || !ref.current) return;
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const anim = lottie.loadAnimation({ container: ref.current, renderer: "svg", loop: !still, autoplay: !still, animationData });
        if (still) anim.goToAndStop(60, true);
        destroy = () => anim.destroy();
      },
    );
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, []);

  return <div ref={ref} aria-hidden className={`aspect-video ${className ?? ""}`} />;
}
