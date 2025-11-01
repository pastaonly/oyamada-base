'use client';

import clsx from "clsx";
import { getCommonsIconById } from "@/constants/commons";

type ActivityIconBadgeProps = {
  iconId: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES: Record<ActivityIconBadgeProps["size"], string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

export function ActivityIconBadge({ iconId, size = "md", className }: ActivityIconBadgeProps) {
  const iconDefinition = getCommonsIconById(iconId);
  const IconComponent = iconDefinition?.icon;

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden={IconComponent ? undefined : "true"}
    >
      {IconComponent ? <IconComponent className="h-5 w-5" /> : "?"}
    </span>
  );
}
