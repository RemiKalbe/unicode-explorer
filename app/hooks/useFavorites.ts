import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "unicode_favs";

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setFavorites(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load favorites from localStorage:", e);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch (e) {
        console.error("Failed to save favorites to localStorage:", e);
      }
    }
  }, [favorites, isLoaded]);

  const toggleFavorite = useCallback((code: number) => {
    setFavorites((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  }, []);

  const isFavorite = useCallback(
    (code: number) => favorites.includes(code),
    [favorites]
  );

  const addFavorite = useCallback((code: number) => {
    setFavorites((prev) => {
      if (prev.includes(code)) return prev;
      return [...prev, code];
    });
  }, []);

  const removeFavorite = useCallback((code: number) => {
    setFavorites((prev) => prev.filter((c) => c !== code));
  }, []);

  return {
    favorites,
    isLoaded,
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
  };
}
