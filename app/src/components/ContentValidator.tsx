import { AlertCircle } from "lucide-react";
import { ContentSanitizer } from "@/lib/sanitize";

interface ContentValidatorProps {
  content: string;
  title?: string;
  showDetails?: boolean;
}

/**
 * Validator component that displays warnings about Unicode characters
 * that will be sanitized during publishing
 */
export function ContentValidator({ content, title, showDetails = false }: ContentValidatorProps) {
  const validation = ContentSanitizer.validate(content);

  if (validation.valid) {
    return null;
  }

  const replacementCount = Object.keys(validation.replacements).length;

  return (
    <div className="mt-2 space-y-2">
      {validation.issues.length > 0 && (
        <div className="flex gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-700 dark:text-yellow-400" aria-hidden="true" />
          <div className="flex-1">
            <p className="font-medium text-yellow-900 dark:text-yellow-200">{title ? `${title}: ` : ""}Special characters detected</p>
            <ul className="mt-1 space-y-0.5 text-xs text-yellow-800 dark:text-yellow-300">
              {validation.issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
            {replacementCount > 0 && showDetails && (
              <details className="mt-2 cursor-pointer">
                <summary className="font-medium hover:underline">View {replacementCount} replacement{replacementCount !== 1 ? "s" : ""}</summary>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto bg-white/50 p-2 dark:bg-black/20">
                  {Object.entries(validation.replacements).map(([char, replacement], i) => (
                    <div key={i} className="text-xs font-mono">
                      <span className="inline-block min-w-12 text-center rounded bg-yellow-100 px-1 dark:bg-yellow-900">{char}</span>
                      <span className="mx-2">→</span>
                      <span className="text-gray-700 dark:text-gray-300">{replacement}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
