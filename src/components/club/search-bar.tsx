"use client";

import { Faders, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SearchBar({
  initialValue = "",
  placeholder,
  filterCount = 0,
  onSearch,
  onFilterOpen,
}: {
  initialValue?: string;
  placeholder: string;
  filterCount?: number;
  onSearch: (q: string) => void;
  onFilterOpen?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <div className="min-w-0 flex-1">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          leadingIcon={<MagnifyingGlass size={26} weight="bold" />}
          enterKeyHint="search"
        />
      </div>
      {onFilterOpen && (
        <Button
          type="button"
          variant="outline"
          className="relative h-14 shrink-0 px-4"
          onClick={onFilterOpen}
        >
          <Faders size={22} weight="bold" />
          필터
          {filterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-coral-500 px-1 text-xs font-bold text-white">
              {filterCount}
            </span>
          )}
        </Button>
      )}
    </form>
  );
}
