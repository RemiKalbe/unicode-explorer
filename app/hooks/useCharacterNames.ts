import { useState, useEffect, useCallback } from "react";

type CharacterNames = Record<string, string>; // hex code -> name

const namesCache = new Map<string, CharacterNames>();
const loadingPromises = new Map<string, Promise<CharacterNames>>();

/**
 * Hook to fetch and cache character names for a Unicode block
 * Names are loaded from JSON files generated at build time
 */
export function useCharacterNames(blockSlug: string) {
  const [names, setNames] = useState<CharacterNames>(() => {
    return namesCache.get(blockSlug) || {};
  });
  const [isLoading, setIsLoading] = useState(!namesCache.has(blockSlug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already cached
    if (namesCache.has(blockSlug)) {
      setNames(namesCache.get(blockSlug)!);
      setIsLoading(false);
      return;
    }

    // Already loading
    if (loadingPromises.has(blockSlug)) {
      loadingPromises.get(blockSlug)!.then((data) => {
        setNames(data);
        setIsLoading(false);
      });
      return;
    }

    // Start loading
    setIsLoading(true);
    setError(null);

    const loadPromise = fetch(`/unicode-data/${blockSlug}.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load character names: ${res.status}`);
        }
        return res.json() as Promise<CharacterNames>;
      })
      .then((data) => {
        namesCache.set(blockSlug, data);
        return data;
      })
      .catch((err) => {
        console.warn(`Could not load names for block ${blockSlug}:`, err);
        // Return empty object on error - names are optional
        const emptyData: CharacterNames = {};
        namesCache.set(blockSlug, emptyData);
        return emptyData;
      })
      .finally(() => {
        loadingPromises.delete(blockSlug);
      });

    loadingPromises.set(blockSlug, loadPromise);

    loadPromise.then((data) => {
      setNames(data);
      setIsLoading(false);
    });
  }, [blockSlug]);

  const getName = useCallback(
    (charCode: number): string | undefined => {
      const hex = charCode.toString(16).toUpperCase();
      return names[hex];
    },
    [names]
  );

  return { names, getName, isLoading, error };
}

/**
 * Search characters by name within a block's names
 */
export function searchByName(
  names: CharacterNames,
  query: string
): number[] {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  const results: number[] = [];

  for (const [hex, name] of Object.entries(names)) {
    if (name.toLowerCase().includes(lowerQuery)) {
      results.push(parseInt(hex, 16));
    }
  }

  return results.sort((a, b) => a - b);
}
