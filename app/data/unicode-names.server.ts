/**
 * Server-side utility to load Unicode character names
 * Names are generated at build time by scripts/build-unicode-data.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const NAMES_DIR = join(__dirname, "unicode-names");

export type CharacterNames = Record<string, string>; // hex code -> name

// Cache loaded names in memory
const namesCache = new Map<string, CharacterNames>();

/**
 * Load character names for a Unicode block
 * Returns empty object if names file doesn't exist (graceful degradation)
 */
export function loadBlockNames(blockSlug: string): CharacterNames {
  // Check cache first
  if (namesCache.has(blockSlug)) {
    return namesCache.get(blockSlug)!;
  }

  const filePath = join(NAMES_DIR, `${blockSlug}.json`);

  if (!existsSync(filePath)) {
    // Names not available for this block - return empty
    const emptyData: CharacterNames = {};
    namesCache.set(blockSlug, emptyData);
    return emptyData;
  }

  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8")) as CharacterNames;
    namesCache.set(blockSlug, data);
    return data;
  } catch (error) {
    console.warn(`Failed to load names for block ${blockSlug}:`, error);
    const emptyData: CharacterNames = {};
    namesCache.set(blockSlug, emptyData);
    return emptyData;
  }
}

/**
 * Get a single character name by code point
 */
export function getCharacterName(
  names: CharacterNames,
  charCode: number
): string | undefined {
  const hex = charCode.toString(16).toUpperCase();
  return names[hex];
}
