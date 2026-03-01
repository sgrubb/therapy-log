import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sortableName(person: { first_name: string; last_name: string }): string {
  return `${person.last_name} ${person.first_name}`;
}
