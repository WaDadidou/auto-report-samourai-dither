import { Octokit } from "octokit";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import advancedFormat from "dayjs/plugin/advancedFormat";
import * as dotenv from "dotenv";
import { EXCLUDED_USERS, READY_REVIEW_LABEL, REPO } from "./constants";
import { PullRequest, Issue } from "./types";
import { formatDateRange, hasLabel, isExcludedUser, lastMonday, nextMonday, thisMonday } from "./utils";

dayjs.extend(isBetween);
dayjs.extend(advancedFormat);
dotenv.config();

// Load GitHub token and repository
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const [owner, repo] = REPO.split("/");

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Fetch pull requests from GitHub using Octokit
async function fetchPRs(): Promise<PullRequest[]> {
  const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    state: "all",
    per_page: 100,
    sort: "updated",
    direction: "desc",
  });
  return response.data;
}

// Fetch issues from GitHub (excluding pull requests)
async function fetchIssues(): Promise<Issue[]> {
  const response = await octokit.request("GET /repos/{owner}/{repo}/issues", {
    owner,
    repo,
    state: "open",
    since: lastMonday.toISOString(),
    per_page: 100,
  });

  // Filter out pull requests (issues with a pull_request field)
  return response.data.filter((issue: any) => !issue.pull_request);
}

// Main reporting function
(async () => {
  const prs = await fetchPRs();
  const issues = await fetchIssues();

  // PRs merged between last Monday and next Monday
  const mergedThisWeek = prs.filter(pr => {
    if (!pr.merged_at) return false;
    if (isExcludedUser(pr.user.login)) return false;
    const mergedAt = dayjs(pr.merged_at);
    return mergedAt.isBetween(lastMonday, nextMonday, null, "[)");
  });

  // PRs waiting for review (open, not draft, not merged, not from excluded user, not updated today)
  const waitingReview = prs.filter(pr => {
    if (pr.state !== "open" || pr.draft || pr.merged_at) return false;
    if (isExcludedUser(pr.user.login)) return false;
    if (!hasLabel(pr, READY_REVIEW_LABEL)) return false;
    const updatedAt = dayjs(pr.updated_at);
    return updatedAt.isBefore(dayjs().subtract(1, "day"));
  });

  // Draft PRs in progress (not from excluded users)
  const inProgress = prs.filter(pr => {
    if (pr.state !== "open") return false;
    if (isExcludedUser(pr.user.login)) return false;
    const createdAt = dayjs(pr.created_at);
    if (createdAt.isBefore(lastMonday)) return false;
    return !hasLabel(pr, READY_REVIEW_LABEL);
  });

  // Open issues created this week, excluding excluded users
  const issuesOpened = issues.filter(issue => !isExcludedUser(issue.user?.login || ""));

  // Compose markdown report
  let markdownMessage = "";

  if (mergedThisWeek.length) {
    markdownMessage += `- PR Merged ✅\n`;
    for (const pr of mergedThisWeek) {
      markdownMessage += `    - **${pr.title}** https://github.com/${REPO}/pull/${pr.number} ${pr.user.login}\n`;
    }
  }

  if (waitingReview.length) {
    markdownMessage += `- PR Waiting for Review ⚠️\n`;
    for (const pr of waitingReview) {
      markdownMessage += `    - **${pr.title}** https://github.com/${REPO}/pull/${pr.number} ${pr.user.login}\n`;
    }
  }

  if (inProgress.length) {
    markdownMessage += `- PR In Progress 🚧\n`;
    for (const pr of inProgress) {
      markdownMessage += `    - **${pr.title}** https://github.com/${REPO}/pull/${pr.number} ${pr.user.login}\n`;
    }
  }

  if (issuesOpened.length) {
    markdownMessage += `- Issues Opened ❗\n`;
    for (const issue of issuesOpened) {
      if(issue.user) {
        markdownMessage += `    - **${issue.title}** https://github.com/${REPO}/issues/${issue.number} ${issue.user.login}\n`;
      } 
    }
  }

  if (!markdownMessage) {
    markdownMessage = "- No items to report this week.";
  }

  // Print Markdown version
  console.log("Markdown Report:\n", markdownMessage);

  // Compose Signal version (plain text)
  const signalReportHeader =
    `Here's the weekly report on the Samourai team's contributions 🥷\n` +
    `${formatDateRange(lastMonday, thisMonday)}\n\n` +
    `Dither:\n\n`;

  const signalReportFooter = `\nHave a nice week! ✨`;

  console.log(
    "\nSignal report:\n",
    signalReportHeader + markdownMessage.replace(/\*\*/g, "") + signalReportFooter
  );
})();
