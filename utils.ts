import dayjs from "dayjs";
import { EXCLUDED_USERS } from "./constants";
import { PullRequest } from "./types";

// Format a date range like "July 8th - July 14th"
export function formatDateRange(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  return `${start.format("MMMM Do")} - ${end.subtract(1, "day").format("MMMM Do")}`;
}
// Date range: this week (Monday to Monday)
export const today = dayjs();
export const thisMonday = today.day() === 1 ? today.startOf("day") : today.startOf("week").add(1, "day");
export const lastMonday = thisMonday.subtract(7, "day");
export const nextMonday = thisMonday.add(7, "day");

export function isExcludedUser(userLogin: string): boolean {
  return EXCLUDED_USERS.includes(userLogin);
}

export function hasLabel(pr: PullRequest, label: string): boolean {
  return pr.labels?.some(prLabel =>
    typeof prLabel === "string" ? label === label : prLabel.name === label
  ) ?? false;
}