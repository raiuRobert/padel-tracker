import type { PlayerId } from "./types";

/** Thrown when a player count / court count combination isn't one the engine knows how to run. */
export class RotationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RotationConfigError";
  }
}

export interface Configuration {
  readonly players: number;
  readonly courts: number;
}

/**
 * The combinations we actually play. Each one has its own hand-verified schedule shape, so we
 * reject anything else rather than silently generating a lopsided rotation.
 */
export const SUPPORTED_CONFIGURATIONS: readonly Configuration[] = [
  { players: 4, courts: 1 },
  { players: 5, courts: 1 },
  { players: 6, courts: 1 },
  { players: 8, courts: 2 },
];

export function isSupportedConfiguration(players: number, courts: number): boolean {
  return SUPPORTED_CONFIGURATIONS.some((c) => c.players === players && c.courts === courts);
}

export function describeSupportedConfigurations(): string {
  return SUPPORTED_CONFIGURATIONS.map((c) => `${c.players} players on ${c.courts} court${c.courts > 1 ? "s" : ""}`).join(", ");
}

/**
 * Validates the roster and configuration up front. Everything downstream assumes this has passed,
 * which is why the generators can index into the roster without re-checking lengths.
 */
export function assertValidRoster(players: readonly PlayerId[], courts: number): void {
  const unique = new Set(players);
  if (unique.size !== players.length) {
    throw new RotationConfigError("Roster contains duplicate players.");
  }
  if (!Number.isInteger(courts) || courts < 1) {
    throw new RotationConfigError(`Court count must be a positive integer, got ${courts}.`);
  }
  if (!isSupportedConfiguration(players.length, courts)) {
    throw new RotationConfigError(
      `${players.length} players on ${courts} court${courts > 1 ? "s" : ""} isn't a supported setup. ` +
        `Supported: ${describeSupportedConfigurations()}.`,
    );
  }
}
