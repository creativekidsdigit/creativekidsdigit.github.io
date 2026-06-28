// Typed wrapper around idb-keyval. All persistent state flows through this module.
import { get, set, del, keys, createStore } from "idb-keyval";

const store = createStore("aicw-os-db", "kv");

/**
 * Bump this when the on-disk shape of any persisted entity changes in a way
 * that requires a migration. The store's hydrate step reads the stored value
 * and falls back to defaults if validation fails, so existing data is never
 * silently corrupted — it's either accepted, migrated, or discarded with a
 * console warning.
 */
export const SCHEMA_VERSION = 1;

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
  /**
   * Like `get`, but additionally runs the value through a shape guard. If the
   * guard rejects, the fallback is returned and a single warning is logged.
   * This is how we defend against:
   *   - manually-edited IndexedDB (devtools)
   *   - imported backups from a different schema
   *   - half-written values from a previous tab that crashed mid-write
   */
  async getValidated<T>(
    key: string,
    fallback: T,
    isValid: (v: unknown) => v is T
  ): Promise<T> {
    try {
      const v = await get(key, store);
      if (v === undefined || v === null) return fallback;
      if (isValid(v)) return v;
      console.warn(
        `[storage.getValidated] rejecting malformed value at "${key}", using fallback`
      );
      return fallback;
    } catch (e) {
      console.warn("[storage.getValidated] failed", key, e);
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
  /**
   * Clears every known app key. Used by the in-app "Reset workspace" recovery
   * affordance in Settings. Intentionally narrow: only deletes the keys we
   * actually own, never `clear()` on the whole store.
   */
  async clearAll(): Promise<void> {
    await Promise.all(Object.values(K).map((k) => storage.del(k)));
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
  campaigns: "campaigns",
  perfSnapshots: "perfSnapshots",
  campaignBuilderDraft: "campaignBuilderDraft",
} as const;
