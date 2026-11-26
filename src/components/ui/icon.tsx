import React from "react";
import type { ColorValue } from "react-native";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Eye,
  EyeOff,
  Home,
  Info,
  MailOpen,
  type LucideIcon,
  Menu,
  Settings,
  Trash2,
  User,
  X,
} from "lucide-react-native";

export type IconName =
  | "arrow-left"
  | "home"
  | "user"
  | "settings"
  | "bell"
  | "calendar"
  | "clock"
  | "menu"
  | "chevron-right"
  | "check"
  | "compass"
  | "info"
  | "eye"
  | "eye-off"
  | "trash"
  | "mail-open"
  | "x";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

const ICON_MAP: Record<IconName, LucideIcon> = {
  "arrow-left": ArrowLeft,
  home: Home,
  user: User,
  settings: Settings,
  bell: Bell,
  calendar: Calendar,
  clock: Clock,
  menu: Menu,
  "chevron-right": ChevronRight,
  check: Check,
  compass: Compass,
  info: Info,
  eye: Eye,
  "eye-off": EyeOff,
  trash: Trash2,
  "mail-open": MailOpen,
  x: X,
};

export function Icon({ name, size = 24, color = "#000", strokeWidth = 2 }: IconProps) {
  const Component = ICON_MAP[name] ?? Home;
  return <Component size={size} color={color as string} strokeWidth={strokeWidth} />;
}

export { Bell, Check, ChevronRight, Compass, Eye, EyeOff, Home, Info, Menu, Settings, User };
