import { Octokit } from "octokit";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import advancedFormat from "dayjs/plugin/advancedFormat";
import * as dotenv from "dotenv";
import { ISSUE_OPENED_LABEL, PR_IN_PROGRESS_LABEL, PR_MERGED_LABEL, PR_WAITING_REVIEW_LABEL, READY_REVIEW_GITHUB_LABEL, REPO } from "./constants";
import { PullRequest, Issue } from "./types";
import { formatDateRange, formatMarkdownToSignalReport, hasLabel, lastMonday, nextMonday, thisMonday } from "./utils";

dayjs.extend(isBetween);
dayjs.extend(advancedFormat);
dotenv.config();

// Load GitHub token and repository
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const [owner, repo] = REPO.split("/");

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Check if a user belongs to the samouraiworld organization
async function isSamouraiMember(userLogin: string): Promise<boolean> {
  try {
    await octokit.rest.orgs.checkMembershipForUser({
      org: "samouraiworld",
      username: userLogin,
    });
    return true;
  } catch {
    return false;
  }
}

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

// Fetch issues from GitHub 
async function fetchIssues(): Promise<Issue[]> {
  const response = await octokit.request("GET /repos/{owner}/{repo}/issues", {
    owner,
    repo,
    state: "open",
    since: lastMonday.toISOString(),
    per_page: 100,
  });

  // Filter out pull requests
  return response.data.filter((issue: any) => !issue.pull_request);
}

// Main reporting function
(async () => {
  const prs = await fetchPRs();
  const issues = await fetchIssues();

  // ---- PRs
  const mergedThisWeek: PullRequest[] = [];
  const waitingReview: PullRequest[] = [];
  const inProgress: PullRequest[] = [];

  for (const pr of prs) {
    const userLogin = pr.user?.login;
    if (!userLogin || !(await isSamouraiMember(userLogin))) continue;

    const createdAt = dayjs(pr.created_at);
    const mergedAt = pr.merged_at ? dayjs(pr.merged_at) : null;

    // PRs merged
    if (mergedAt && mergedAt.isBetween(lastMonday, nextMonday, null, "[)")) {
      mergedThisWeek.push(pr);
      continue;
    }

    if (pr.state !== "open" || pr.merged_at) {
      continue;
    }

    // PRs in progress including drafts
    if (!hasLabel(pr, READY_REVIEW_GITHUB_LABEL) && createdAt.isBetween(lastMonday, nextMonday, null, "[)")) {
      inProgress.push(pr);
      continue;
    }

    if (pr.draft) {
      continue;
    }

    // PRs waiting for review
    if (hasLabel(pr, READY_REVIEW_GITHUB_LABEL) && createdAt.isBetween(lastMonday, nextMonday, null, "[)")) {
      waitingReview.push(pr);
      continue;
    }
  }

  // ---- ISSUES
  const issuesOpened: Issue[] = [];
  for (const issue of issues) {
    const login = issue.user?.login;
    if (!login) continue;
    if (!(await isSamouraiMember(login))) continue;
    issuesOpened.push(issue);
  }

  // ---- Compose markdown report
  let markdownMessage = "";

  if (mergedThisWeek.length) {
    markdownMessage += `${PR_MERGED_LABEL}\n`;
    for (const pr of mergedThisWeek) {
      markdownMessage += `    - **${pr.title}** https://github.com/${REPO}/pull/${pr.number} ${pr.user.login}\n`;
    }
  }

  if (waitingReview.length) {
    markdownMessage += `${PR_WAITING_REVIEW_LABEL}\n`;
    for (const pr of waitingReview) {
      markdownMessage += `    - **${pr.title}** https://github.com/${REPO}/pull/${pr.number} ${pr.user.login}\n`;
    }
  }

  if (inProgress.length) {
    markdownMessage += `${PR_IN_PROGRESS_LABEL}\n`;
    for (const pr of inProgress) {
      markdownMessage += `    - **${pr.title}** https://github.com/${REPO}/pull/${pr.number} ${pr.user.login}\n`;
    }
  }

  if (issuesOpened.length) {
    markdownMessage += `${ISSUE_OPENED_LABEL}\n`;
    for (const issue of issuesOpened) {
      markdownMessage += `    - **${issue.title}** https://github.com/${REPO}/issues/${issue.number} ${issue.user!.login}\n`;
    }
  }

  if (!markdownMessage) {
    markdownMessage = "- No items to report this week.";
  }

  // Print Markdown report
  console.log("----------------------------------\nMarkdown Report\n----------------------------------\n", markdownMessage + "\n----------------------------------");

  // ---- Compose Signal report
  const signalReportHeader =
    `Here's the weekly report on the Samourai team's contributions 🥷\n` +
    `${formatDateRange(lastMonday, thisMonday)}\n\n` +
    `Dither:\n\n`;

  const signalReportFooter = `\n\nHave a nice week! ✨\n----------------------------------`;

  // Print Signal report (Plain text)
  console.log(
    "Signal report:\n----------------------------------\n",
    signalReportHeader + formatMarkdownToSignalReport(markdownMessage) + signalReportFooter
  );
})();