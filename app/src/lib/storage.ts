// Typed wrapper around idb-keyval. All persistent state flows through this module.
import { get, set, del, keys, createStore } from "idb-keyval";

const store = createStore("aicw-os-db", "kv");

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const v = await get<T>(key, store);
      return (v as T) ?? fallback;
    } catch (e) {
      console.warn("[storage.get] failed", key, e);
      return fallback;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await set(key, value, store);
    } catch (e) {
      console.warn("[storage.set] failed", key, e);
    }
  },
  async del(key: string): Promise<void> {
    try {
      await del(key, store);
    } catch (e) {
      console.warn("[storage.del] failed", key, e);
    }
  },
  async keys(): Promise<string[]> {
    try {
      return (await keys(store)) as string[];
    } catch {
      return [];
    }
  },
};

// Keys used throughout the app — keep them centralized.
export const K = {
  products: "products",
  content: "content",
  prompts: "prompts",
  settings: "settings",
  tasks: "tasks",
  launches: "launches",
  ideas: "ideas",
} as const;
