import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { deleteFileFromGitHubRepo, publishToGitHubRepo, getFileFromGitHubRepo } from "@/lib/publish";
import { githubConfigFromSettings } from "@/lib/githubConfig";

export default function PublishHistoryPage() {
  const settings = useAppStore((s) => s.settings);
  const [hist, setHist] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aicw.publish.history");
      setHist(raw ? JSON.parse(raw) : []);
    } catch {
      setHist([]);
    }
  }, []);

  async function republish(entry: any) {
    const { owner, repo, branch, token } = githubConfigFromSettings(settings);
    if (!token || !owner || !repo) return alert("Missing GitHub settings/token");

    try {
      const branchToUse = branch || "main";
      let content = entry.content || "";
      if (!content) {
        const file = await getFileFromGitHubRepo({ owner, repo, path: entry.path, branch: branchToUse, token });
        content = file.content || content;
      }
      const res = await publishToGitHubRepo({ owner, repo, path: entry.path, token, branch: branchToUse, content, message: `Republish: ${entry.title}` });
      alert(`Republished: ${res.url}`);
    } catch (e: any) {
      alert(String(e.message || e));
    }
  }

  async function deleteRemote(entry: any) {
    const { owner, repo, branch, token } = githubConfigFromSettings(settings);
    if (!token || !owner || !repo) return alert("Missing GitHub settings/token");

    try {
      const branchToUse = branch || "main";
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(entry.path)}?ref=${encodeURIComponent(branchToUse)}`, {
        headers: { Authorization: `token ${token}` },
      });
      if (!metaRes.ok) throw new Error("Failed to fetch file info");
      const js = await metaRes.json();
      const sha = js.sha;
      await deleteFileFromGitHubRepo({ owner, repo, path: entry.path, token, sha, message: `Delete: ${entry.title}`, branch: branchToUse });
      alert("Deleted from repo");
    } catch (e: any) {
      alert(String(e.message || e));
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Publish History</h1>
      <div className="space-y-3">
        {hist.length === 0 && <div className="text-slate-500">No published posts yet.</div>}
        {hist.map((h) => (
          <div key={h.slug} className="flex items-center justify-between rounded border p-3">
            <div>
              <div className="font-medium">{h.title}</div>
              <div className="text-sm text-slate-500">{h.slug} · {new Date(h.date).toLocaleString()}</div>
              <div className="text-sm"><a href={h.url} target="_blank" rel="noreferrer">{h.url}</a></div>
            </div>
            <div className="flex gap-2">
              <Link to={`/library?focus=${h.id}`} className="btn-ghost">Edit</Link>
              <button className="btn-secondary" onClick={() => republish(h)}>Republish</button>
              <button className="btn-ghost" onClick={() => deleteRemote(h)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
