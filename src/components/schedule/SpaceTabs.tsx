'use client';

import { SPACES, type SpaceKey } from "@/constants/schedule";

type SpaceTabsProps = {
  spaces: SpaceKey[];
  activeSpace: SpaceKey;
  preferredSpace: SpaceKey | null;
  onSelect: (space: SpaceKey) => void;
  onFavoriteClick: (space: SpaceKey) => void;
  isFavoriteUpdating: boolean;
  className?: string;
};

export function SpaceTabs({
  spaces,
  activeSpace,
  preferredSpace,
  onSelect,
  onFavoriteClick,
  isFavoriteUpdating,
  className = "",
}: SpaceTabsProps) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      {spaces.map((spaceKey) => {
        const isActive = activeSpace === spaceKey;
        const isFavorite = preferredSpace === spaceKey;

        return (
          <div key={spaceKey} className="relative flex flex-col items-center">
            {isActive ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onFavoriteClick(spaceKey);
                }}
                disabled={isFavoriteUpdating || isFavorite}
                title={isFavorite ? "お気に入りに設定済み" : "お気に入りに設定"}
                className={`absolute -top-5 left-1/2 -translate-x-1/2 text-xl leading-none transition ${
                  isFavorite ? "text-amber-400" : "text-slate-300 hover:text-amber-400"
                } ${isFavoriteUpdating ? "opacity-60" : ""} disabled:cursor-default`}
                aria-pressed={isFavorite}
                aria-label={`${SPACES[spaceKey].label} をお気に入りに設定`}
              >
                <span aria-hidden="true">★</span>
              </button>
            ) : null}
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
