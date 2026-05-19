import type { ReactNode } from "react";

export type SettingsView =
  | "main"
  | "about"
  | "bookmarks"
  | "language"
  | "browsing-data"
  | "downloads";

export interface SettingsSection {
  id: string;
  title: string;
  items: SettingsItem[];
}

export interface SettingsItem {
  id: string;
  label: string;
  value?: string;
  icon?: ReactNode;
  hasDetail?: boolean;
  onClick?: () => void;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
}

export const defaultBookmarks: Bookmark[] = [
  {
    id: "default-google",
    title: "Google",
    url: "https://www.google.com",
    favicon: "https://www.google.com/s2/favicons?domain=google.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "default-youtube",
    title: "YouTube",
    url: "https://www.youtube.com",
    favicon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "default-netflix",
    title: "Netflix",
    url: "https://www.netflix.com",
    favicon: "https://www.google.com/s2/favicons?domain=netflix.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: "default-x",
    title: "X",
    url: "https://x.com",
    favicon: "https://www.google.com/s2/favicons?domain=x.com&sz=128",
    createdAt: 0,
    updatedAt: 0,
  },
];
