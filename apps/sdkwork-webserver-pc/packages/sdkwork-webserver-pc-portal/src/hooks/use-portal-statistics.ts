import { useEffect, useState } from "react";
import type { PortalStatisticsPort, PortalStatisticsSnapshot } from "../types.ts";

export type PortalStatisticsState =
  | { status: "anonymous" }
  | { status: "error" }
  | { status: "loading" }
  | { snapshot: PortalStatisticsSnapshot; status: "ready" };

export function usePortalStatistics(
  statistics: PortalStatisticsPort | undefined,
): PortalStatisticsState {
  const [state, setState] = useState<PortalStatisticsState>(() => (
    statistics ? { status: "loading" } : { status: "anonymous" }
  ));

  useEffect(() => {
    if (!statistics) {
      setState({ status: "anonymous" });
      return undefined;
    }

    let active = true;
    setState({ status: "loading" });
    void statistics.load().then(
      (snapshot) => {
        if (active) setState({ snapshot, status: "ready" });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );

    return () => {
      active = false;
    };
  }, [statistics]);

  return state;
}
