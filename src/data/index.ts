import { IndexedDbRepository } from "./indexeddb";
import { InMemoryRepository } from "./memory";
import type { PadelRepository } from "./repository";

export * from "./repository";
export { InMemoryRepository } from "./memory";
export { IndexedDbRepository } from "./indexeddb";

let repository: PadelRepository | undefined;

/**
 * The app's single repository instance.
 *
 * Swapping the MVP's IndexedDB for a real backend means adding one implementation and changing
 * this function — nothing that imports it needs to know which one it got.
 */
export function getRepository(): PadelRepository {
  repository ??= typeof indexedDB === "undefined" ? new InMemoryRepository() : new IndexedDbRepository();
  return repository;
}

/** Test seam: force a specific implementation. */
export function setRepository(next: PadelRepository): void {
  repository = next;
}
