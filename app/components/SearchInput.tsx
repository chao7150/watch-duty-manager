import type React from "react";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSearching?: boolean;
  placeholder?: string;
}

export const Component: React.FC<SearchInputProps> = ({
  value,
  onChange,
  isSearching = false,
  placeholder = "検索...",
}) => {
  return (
    <div className="relative w-full md:w-72">
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 border rounded-md text-sm border-outline bg-accent-area text-text focus:border-link focus:outline-none placeholder-text-weak"
      />
      {isSearching && (
        <span className="absolute right-3 top-2.5 text-xs text-text-weak animate-pulse">
          検索中...
        </span>
      )}
    </div>
  );
};
