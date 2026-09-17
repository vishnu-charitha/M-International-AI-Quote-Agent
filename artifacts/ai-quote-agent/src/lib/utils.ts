import { twMerge } from 'tailwind-merge';

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if ("items" in value && Array.isArray((value as any).items)) return (value as any).items;
  if ("data" in value && Array.isArray((value as any).data)) return (value as any).data;
  return [];
};
