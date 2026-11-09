import React from "react";
import { ResponsiveContainer as RechartsResponsiveContainer } from "recharts";

const DEFAULT_INITIAL_DIMENSION = { width: 320, height: 240 };

/**
 * Keeps Recharts stable while routed, tabbed, or animated layouts are briefly
 * unmeasurable. Callers can still override every default when needed.
 */
const SafeResponsiveContainer = ({
  initialDimension = DEFAULT_INITIAL_DIMENSION,
  minWidth = 100,
  minHeight = 100,
  ...props
}) => (
  <RechartsResponsiveContainer
    initialDimension={initialDimension}
    minWidth={minWidth}
    minHeight={minHeight}
    {...props}
  />
);

export default SafeResponsiveContainer;
