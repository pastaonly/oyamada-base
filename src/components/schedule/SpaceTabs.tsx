'use client';

import { SPACES, type SpaceKey } from "@/constants/schedule";

type SpaceTabsProps = {
  spaces: SpaceKey[];
  activeSpace: SpaceKey;
  onSelect: (space: SpaceKey) => void;
  className?: string;
};

export function SpaceTabs({
  spaces,
  activeSpace,
  onSelect,
  className = "",
}: SpaceTabsProps) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      {spaces.map((spaceKey) => {
        const isActive = activeSpace === spaceKey;

        return (
          <div key={spaceKey} className="flex flex-col items-center">
            <button
              type="button"
              onClick={() => onSelect(spaceKey)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-blue-500 bg-blue-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {SPACES[spaceKey].label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
