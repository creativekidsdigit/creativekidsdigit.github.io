import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export function isSupportedImportFile(file: File) {
  const name = file.name.toLowerCase();
  return [".docx", ".pdf", ".txt", ".md", ".html", ".htm"].some((ext) => name.endsWith(ext));
}

function stripHtml(text: string) {
  if (typeof window === "undefined") {
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const doc = new DOMParser().parseFromString(text, "text/html");
  return (doc.body?.innerText || doc.documentElement?.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractTextFromFile(file: File) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  if (name.endsWith(".pdf")) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const chunks: string[] = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ((item as { str?: string }).str ?? "").trim())
        .filter(Boolean)
        .join(" ");

      if (text) {
        chunks.push(text);
      }
    }

    return chunks.join("\n\n").trim();
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return file.text();
  }

  if (name.endsWith(".html") || name.endsWith(".htm")) {
    const contents = await file.text();
    return stripHtml(contents);
  }

  throw new Error("Unsupported file type. Please upload a .docx, .pdf, .txt, .md, .html, or .htm file.");
}
