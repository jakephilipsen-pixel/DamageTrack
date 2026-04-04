import { format, parseISO } from "date-fns";

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy HH:mm");
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy");
}

export function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function photoUrl(filename: string): string {
  return `/uploads/photos/${filename}`;
}

export function thumbnailUrl(thumbnail: string): string {
  return `/uploads/thumbnails/${thumbnail}`;
}

export function faultLabel(fault: string): string {
  return fault === "WAREHOUSE" ? "Warehouse" : "Transport";
}

export function faultColor(fault: string): string {
  return fault === "WAREHOUSE"
    ? "bg-amber-500/20 text-amber-400"
    : "bg-blue-500/20 text-blue-400";
}
