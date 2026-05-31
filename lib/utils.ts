import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const bdDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Dhaka",
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBdDateTime(value?: string | null): string {
  if (!value) return "—"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  const parts = bdDateTimeFormatter.formatToParts(date)
  const day = parts.find((part) => part.type === "day")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const year = parts.find((part) => part.type === "year")?.value
  const hour = parts.find((part) => part.type === "hour")?.value
  const minute = parts.find((part) => part.type === "minute")?.value
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value?.toUpperCase()

  if (!day || !month || !year || !hour || !minute || !dayPeriod) {
    return bdDateTimeFormatter.format(date)
  }

  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`
}

export const colorPalette = [
  "#FF6B9D",
  "#A3D5FF",
  "#FFD4A3",
  "#A8D5BA",
  "#4CB8FF",
  "#66D9A3",
  "#003D5C",
  "#5F9EA0",
  "#C84B4B",
  "#FFE66D",
  "#A8E10C",
  "#FFB6D9",
  "#FFB84D",
  "#6B8E23",
  "#8B0000",
  "#FF8C42",
  "#F5E6D3",
  "#5F9B9F",
  "#7B68EE",
  "#00CED1",
  "#FF9A76",
  "#9370DB",
  "#FF69B4",
  "#654321",
  "#CC7722",
  "#1A1A2E",
  "#B5EAD7",
  "#FFD6A5",
  "#90EE90",
  "#87CEEB",
  "#4682B4",
  "#FFD700",
  "#66CDAA",
  "#A9A9A9",
  "#B0C4DE",
  "#008B8B",
  "#FF7F50",
  "#C1FFC1",
  "#DA70D6",
  "#40E0D0",
  "#98FB98",
  "#E0E0E0",
  "#C4D600",
  "#A0522D",
  "#FF6347",
];