'use client';

/* eslint-disable @next/next/no-img-element */

import clsx from "clsx";
import { useMemo } from "react";

type AvatarProps = {
  src?: string | null;
  fallback?: string | null;
  size?: number;
  className?: string;
  title?: string;
};

export function Avatar({
  src,
  fallback,
  size = 40,
  className,
  title,
}: AvatarProps) {
  const initials = useMemo(() => {
    if (!fallback) {
      return "?";
    }
    const trimmed = fallback.trim();
    if (!trimmed) {
      return "?";
    }
    return trimmed.slice(0, 1).toUpperCase();
  }, [fallback]);

  const dimensionStyle = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={fallback ?? "avatar"}
        title={title ?? fallback ?? "avatar"}
        style={dimensionStyle}
        className={clsx(
          "rounded-full object-cover shadow-sm ring-1 ring-slate-200",
          className,
        )}
      />
    );
  }

  return (
    <span
      title={title ?? fallback ?? "avatar"}
      style={dimensionStyle}
      className={clsx(
        "flex items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200",
        className,
      )}
    >
      {initials}
    </span>
  );
}
