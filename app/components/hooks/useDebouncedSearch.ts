import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

interface UseDebouncedSearchOptions {
  key?: string;
  delay?: number;
}

export function useDebouncedSearch({
  key = "q",
  delay = 250,
}: UseDebouncedSearchOptions = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get(key) ?? "");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // URLの同期
  const currentValFromUrl = searchParams.get(key) ?? "";
  useEffect(() => {
    setSearchQuery(currentValFromUrl);
  }, [currentValFromUrl]);

  // 入力ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchParams(
        (prev) => {
          if (value.trim() === "") {
            prev.delete(key);
          } else {
            prev.set(key, value);
          }
          return prev;
        },
        { replace: true }, // ブラウザ履歴を汚さない
      );
    }, delay);
  };

  // アンマウント時クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    searchQuery,
    handleChange,
    hasQuery: searchQuery.trim() !== "",
  };
}
