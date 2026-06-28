import { useLocation } from "react-router-dom";

export function useQueryParam(name: string): string | undefined {
  const { search } = useLocation();
  const v = new URLSearchParams(search).get(name);
  return v ?? undefined;
}
