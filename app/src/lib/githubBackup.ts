import { publishToGitHubRepo, getFileFromGitHubRepo } from "./publish";

export async function publishSnapshotToGitHub({
  owner,
  repo,
  branch,
  token,
  snapshotJson,
}: {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  snapshotJson: string;
}): Promise<{ url: string; sha: string }> {
  if (!owner || !repo) {
    throw new Error("GitHub owner and repo must be configured in Settings.");
  }
  if (!token) {
    throw new Error("GitHub token is missing. Add it in Settings.");
  }

  const result = await publishToGitHubRepo({
    owner,
    repo,
    path: "backup/workspace-snapshot.json",
    branch: branch || "main",
    token,
    content: snapshotJson,
    message: `Workspace snapshot: ${new Date().toISOString()}`,
  });

  return {
    url: result.url,
    sha: result.sha || "",
  };
}

export async function restoreFromGitHubSnapshot({
  owner,
  repo,
  branch,
  token,
}: {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}): Promise<string | null> {
  if (!owner || !repo) {
    throw new Error("GitHub owner and repo must be configured in Settings.");
  }
  if (!token) {
    throw new Error("GitHub token is missing. Add it in Settings.");
  }

  const result = await getFileFromGitHubRepo({
    owner,
    repo,
    path: "backup/workspace-snapshot.json",
    branch: branch || "main",
    token,
  });

  return result.content;
}
