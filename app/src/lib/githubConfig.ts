import type { AppSettings } from "@/types";

export function getGithubToken() {
  try {
    return localStorage.getItem("aicw.github.token") || "";
  } catch {
    return "";
  }
}

export function setGithubToken(token: string) {
  try {
    if (token) {
      localStorage.setItem("aicw.github.token", token);
    } else {
      localStorage.removeItem("aicw.github.token");
    }
  } catch {
    // ignore storage failures; UI handles user-facing errors.
  }
}

export function clearGithubToken() {
  try {
    localStorage.removeItem("aicw.github.token");
  } catch {
    // ignore
  }
}

export function githubConfigFromSettings(settings: AppSettings) {
  return {
    owner: settings.github?.owner?.trim() || "",
    repo: settings.github?.repo?.trim() || "",
    branch: settings.github?.branch?.trim() || "main",
    token: getGithubToken(),
  };
}
