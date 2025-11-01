import {
  BeakerIcon,
  CakeIcon,
  GiftTopIcon,
  HandThumbUpIcon,
  HeartIcon,
  HomeModernIcon,
  SparklesIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import type { ComponentType, SVGProps } from "react";

export type ActivityIconId =
  | "sparkles"
  | "trash"
  | "home"
  | "gift"
  | "heart"
  | "tools"
  | "hand"
  | "cake"
  | "beaker";

type IconDefinition = {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const COMMONS_ICONS: Record<ActivityIconId, IconDefinition> = {
  sparkles: {
    label: "きらきら (掃除など)",
    icon: SparklesIcon,
  },
  trash: {
    label: "ごみ捨て",
    icon: TrashIcon,
  },
  home: {
    label: "ハウスキーピング",
    icon: HomeModernIcon,
  },
  gift: {
    label: "寄贈・お土産",
    icon: GiftTopIcon,
  },
  heart: {
    label: "感謝",
    icon: HeartIcon,
  },
  tools: {
    label: "修理・メンテ",
    icon: WrenchScrewdriverIcon,
  },
  hand: {
    label: "手伝い",
    icon: HandThumbUpIcon,
  },
  cake: {
    label: "差し入れ",
    icon: CakeIcon,
  },
  beaker: {
    label: "植物・水やり",
    icon: BeakerIcon,
  },
};

export const COMMONS_ICON_OPTIONS = Object.entries(COMMONS_ICONS).map(([id, value]) => ({
  id: id as ActivityIconId,
  label: value.label,
  icon: value.icon,
}));

export function getCommonsIconById(id: ActivityIconId | string | null | undefined) {
  if (!id) {
    return null;
  }
  return COMMONS_ICONS[id as ActivityIconId] ?? null;
}
