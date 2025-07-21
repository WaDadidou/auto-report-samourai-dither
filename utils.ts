import dayjs from "dayjs";
import { PullRequest } from "./types";
import { PR_MERGED_LABEL, PR_WAITING_REVIEW_LABEL, PR_IN_PROGRESS_LABEL, ISSUE_OPENED_LABEL } from "./constants";

// Format a date range like "July 7th - July 14th"
export function formatDateRange(start: dayjs.Dayjs, end: dayjs.Dayjs) {
  return `${start.format("MMMM Do")} - ${end.format("MMMM Do")}`;
}

export const today = dayjs();
// Monday of the current week
export const thisMonday = today.day() === 1
  ? today.startOf("day")
  : today.startOf("week").add(1, "day");
// Start of the week (From Monday 23h59)
export const lastMonday = thisMonday.subtract(7, "day");
// End of the week (To Monday 23h59)
export const nextMonday = thisMonday.add(7, "day").endOf("day");

export function hasLabel(pr: PullRequest, label: string): boolean {
  return pr.labels?.some(prLabel =>
    typeof prLabel === "string" ? label === label : prLabel.name === label
  ) ?? false;
}

// Remove Markdown decorations and add extra line breaks for readability
export function formatMarkdownToSignalReport(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(
      new RegExp(
        `\\n?(${[
          PR_MERGED_LABEL,
          PR_WAITING_REVIEW_LABEL,
          PR_IN_PROGRESS_LABEL,
          ISSUE_OPENED_LABEL,
        ].join("|")})`,
        "g"
      ),
      "\n\n$1"
    )
    .trim();
}