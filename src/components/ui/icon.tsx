import React from "react";
import type { ColorValue } from "react-native";
import {
  Bell,
  Check,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  Home,
  Info,
  type LucideIcon,
  Menu,
  Settings,
  User,
} from "lucide-react-native";

export type IconName =
  | "home"
  | "user"
  | "settings"
  | "bell"
  | "menu"
  | "chevron-right"
  | "check"
  | "compass"
  | "info"
  | "eye"
  | "eye-off";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

const ICON_MAP: Record<IconName, LucideIcon> = {
  home: Home,
  user: User,
  settings: Settings,
  bell: Bell,
  menu: Menu,
  "chevron-right": ChevronRight,
  check: Check,
  compass: Compass,
  info: Info,
  eye: Eye,
  "eye-off": EyeOff,
};

export function Icon({ name, size = 24, color = "#000", strokeWidth = 2 }: IconProps) {
  const Component = ICON_MAP[name] ?? Home;
  return <Component size={size} color={color as string} strokeWidth={strokeWidth} />;
}

export { Bell, Check, ChevronRight, Compass, Eye, EyeOff, Home, Info, Menu, Settings, User };
