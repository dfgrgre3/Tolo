"use client";

import { memo } from "react";

type AmbientBackgroundProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  provider: string;
};

export const AmbientBackground = memo((_props: AmbientBackgroundProps) => null);

AmbientBackground.displayName = "AmbientBackground";
