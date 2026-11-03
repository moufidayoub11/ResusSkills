import { parseDate } from "@internationalized/date";
import type { Query } from "./types";

const objectId = /^[a-f\d]{24}$/i;
export function parseQuery(
  input: Record<string, string | string[] | undefined> = {},
  research = false,
): Query {
  const str = (k: string) =>
    String(
      Array.isArray(input[k]) ? (input[k]?.[0] ?? "") : (input[k] ?? ""),
    ).trim();
  const number = (k: string, fallback: number) =>
    Number.isFinite(Number(str(k))) && str(k) ? Number(str(k)) : fallback;
  const date = (k: string) => {
    try {
      return str(k) ? parseDate(str(k)).toString() : "";
    } catch {
      return "";
    }
  };
  const ids = (k: string) =>
    str(k)
      .split(",")
      .filter((x) => objectId.test(x))
      .slice(0, 500);
  const from = date("from"),
    to = date("to");
  return {
    page: Math.max(1, Math.floor(number("page", 1))),
    pageSize: [25, 50, 100].includes(number("pageSize", 25))
      ? number("pageSize", 25)
      : 25,
    search: str("search").slice(0, 120),
    sort: str("sort"),
    direction: str("direction") === "asc" ? "asc" : "desc",
    from,
    to: from && to && to < from ? from : to,
    students: ids("students"),
    status: ["completed", "in-progress", "abandoned"].includes(str("status"))
      ? str("status")
      : "",
    role: ["student", "professor"].includes(str("role")) ? str("role") : "",
    phase: str("phase"),
    question: str("question").slice(0, 100),
    minScore: str("minScore")
      ? Math.max(0, Math.min(100, number("minScore", 0)))
      : undefined,
    maxScore: str("maxScore")
      ? Math.max(0, Math.min(100, number("maxScore", 100)))
      : undefined,
    selection: ["first", "latest", "all"].includes(str("selection"))
      ? (str("selection") as Query["selection"])
      : research
        ? "first"
        : "all",
    availability: ["timed", "untimed", "unresolved", "skipped"].includes(
      str("availability"),
    )
      ? str("availability")
      : "",
    bins: [5, 10, 20].includes(number("bins", 5)) ? number("bins", 5) : 5,
    summary: str("summary") === "median" ? "median" : "mean",
    display: str("display") === "percentage" ? "percentage" : "count",
    grouping: ["day", "week", "month"].includes(str("grouping"))
      ? (str("grouping") as Query["grouping"])
      : "month",
    ids: ids("ids"),
    userId: objectId.test(str("userId")) ? str("userId") : "",
    attemptId: objectId.test(str("attemptId")) ? str("attemptId") : "",
  };
}
export function dateRange(q: Pick<Query, "from" | "to">) {
  const range: Record<string, Date> = {};
  if (q.from) range.$gte = parseDate(q.from).toDate("Africa/Casablanca");
  if (q.to)
    range.$lt = parseDate(q.to).add({ days: 1 }).toDate("Africa/Casablanca");
  return Object.keys(range).length ? range : undefined;
}
export function queryString(q: Partial<Query>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "" && (!Array.isArray(v) || v.length))
      p.set(k, Array.isArray(v) ? v.join(",") : String(v));
  return p.toString();
}
export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
