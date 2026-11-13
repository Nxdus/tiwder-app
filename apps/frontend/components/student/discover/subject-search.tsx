"use client";

import { BookOpen, Check, ListFilter, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SearchOption, Tutor } from "@/lib/student/tutors";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "@/components/loading/skeletons";

export default function SubjectSearch({
  tab,
  hidden,
  query,
  selectedSearch,
  onChange,
  choices,
  loading = false,
}: {
  tab: string;
  hidden: boolean;
  query: string;
  selectedSearch: SearchOption[];
  onChange: (query: string, selected: SearchOption[]) => void;
  choices: Tutor["subjects"];
  loading?: boolean;
}) {
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function closeSearch(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !searchRef.current?.contains(event.target)
      )
        setSearchOpen(false);
    }
    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const row = searchInputRef.current?.parentElement;
    row?.scrollTo({ left: row.scrollWidth });
  }, [selectedSearch]);
  const categorySuggestions = Array.from(
    new Set(choices.map((subject) => subject.category)),
  ).filter(
    (category) =>
      query.trim() &&
      category.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const suggestions = choices.filter((subject) =>
    [subject.name, subject.category].some((value) =>
      value.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  const searchOptions: SearchOption[] = categorySuggestions.length
    ? categorySuggestions.map((category) => ({
        key: `category:${category}`,
        category,
      }))
    : Array.from(
        new Set(suggestions.map((subject) => subject.category)),
      ).flatMap((category) => [
        { key: `category:${category}`, category },
        ...suggestions
          .filter((subject) => subject.category === category)
          .map((subject) => ({
            key: `subject:${subject.name}`,
            category,
            subject,
          })),
      ]);
  function isSearchOptionSelected(option: SearchOption) {
    return option.subject
      ? selectedSearch.some((item) => item.key === option.key)
      : choices
          .filter((subject) => subject.category === option.category)
          .every((subject) =>
            selectedSearch.some(
              (item) => item.key === `subject:${subject.name}`,
            ),
          );
  }
  function searchOptionProps(option: SearchOption) {
    return {
      role: "option",
      id: `search-option-${encodeURIComponent(option.key)}`,
      "aria-selected": isSearchOptionSelected(option),
      "data-active": activeSearch === option.key,
    };
  }
  function handleSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Tab") {
      setSearchOpen(false);
      setActiveSearch(null);
      return;
    }
    if (event.key === "Escape") {
      setSearchOpen(false);
      setActiveSearch(null);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      if (!searchOptions.length) return;
      const current = searchOptions.findIndex(
        (option) => option.key === activeSearch,
      );
      const next =
        current < 0
          ? event.key === "ArrowDown"
            ? 0
            : searchOptions.length - 1
          : (current +
              (event.key === "ArrowDown" ? 1 : -1) +
              searchOptions.length) %
            searchOptions.length;
      setActiveSearch(searchOptions[next].key);
    } else if (event.key === "Enter" && searchOpen && activeSearch) {
      event.preventDefault();
      const option = searchOptions.find((item) => item.key === activeSearch);
      if (!option) return;
      toggleSearchOption(option);
    }
  }
  useEffect(() => {
    if (searchOpen && activeSearch)
      document
        .getElementById(`search-option-${encodeURIComponent(activeSearch)}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [searchOpen, activeSearch]);

  function toggleSearchOption(option: SearchOption) {
    const selected = selectedSearch;
    const nextSelected = (() => {
      if (option.subject)
        return selected.some((item) => item.key === option.key)
          ? selected.filter((item) => item.key !== option.key)
          : [...selected, option];
      const subjects = choices.filter(
        (subject) => subject.category === option.category,
      );
      const allSelected = subjects.every((subject) =>
        selected.some((item) => item.key === `subject:${subject.name}`),
      );
      return allSelected
        ? selected.filter((item) => item.category !== option.category)
        : [
            ...selected,
            ...subjects
              .filter(
                (subject) =>
                  !selected.some(
                    (item) => item.key === `subject:${subject.name}`,
                  ),
              )
              .map((subject) => ({
                key: `subject:${subject.name}`,
                category: subject.category,
                subject,
              })),
          ];
    })();
    onChange("", nextSelected);
    setActiveSearch(null);
    setSearchOpen(true);
    searchInputRef.current?.focus();
  }

  return (
    <section
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`mx-auto mt-8 w-full max-w-[352px] ${hidden ? "hidden" : ""}`}
    >
      <div ref={searchRef} className="relative">
        <div className="flex h-12 items-center gap-2 rounded-2xl border border-input bg-background px-3 shadow-xs transition-shadow focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/10">
          {tab === "Discover" ? (
            <Search
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          ) : (
            <ListFilter
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {selectedSearch.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-label={`Remove ${option.subject?.name ?? option.category}`}
                onClick={() => toggleSearchOption(option)}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span>{option.subject?.name ?? option.category}</span>
                <X aria-hidden="true" className="size-3 shrink-0" />
              </button>
            ))}
            <input
              ref={searchInputRef}
              value={query}
              onFocus={() => setSearchOpen(true)}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? "search-options" : undefined}
              aria-activedescendant={
                searchOpen && activeSearch
                  ? `search-option-${encodeURIComponent(activeSearch)}`
                  : undefined
              }
              onKeyDown={handleSearchKey}
              onChange={(event) => {
                setActiveSearch(null);
                onChange(event.target.value, selectedSearch);
                setSearchOpen(true);
              }}
              placeholder={
                selectedSearch.length
                  ? "Add more..."
                  : "What would you like to learn?"
              }
              aria-label="Search subjects or categories"
              className="h-10 min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        {searchOpen && (
          <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl shadow-foreground/10">
            <div
              id="search-options"
              role="listbox"
              aria-multiselectable="true"
              aria-label="Subjects and categories"
              className="max-h-[min(360px,50dvh)] overflow-y-auto p-2 [&_[aria-selected=true]]:bg-accent [&_[aria-selected=true]]:text-accent-foreground [&_[data-active=true]]:ring-2 [&_[data-active=true]]:ring-inset [&_[data-active=true]]:ring-ring"
            >
              {loading && (
                <LoadingRegion label="Loading subjects…" className="p-2">
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
                  </div>
                </LoadingRegion>
              )}
              {searchOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  {...searchOptionProps(option)}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleSearchOption(option)}
                  className={
                    option.subject
                      ? "group flex min-h-10 w-full items-center gap-3 rounded-xl py-2 pl-11 pr-3 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
                      : "group mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold outline-none transition-colors first:mt-0 hover:bg-accent focus-visible:bg-accent"
                  }
                >
                  {!option.subject && (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <BookOpen
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground"
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    {option.subject?.name ?? option.category}
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex size-4 shrink-0 items-center justify-center rounded border border-input group-aria-selected:border-primary group-aria-selected:bg-primary group-aria-selected:text-primary-foreground"
                  >
                    {isSearchOptionSelected(option) && (
                      <Check className="size-3" />
                    )}
                  </span>
                </button>
              ))}
              {!loading && !searchOptions.length && (
                <div
                  role="status"
                  className="flex flex-col items-center gap-2 px-4 py-8 text-center"
                >
                  <Search
                    aria-hidden="true"
                    className="size-6 text-muted-foreground"
                  />
                  <p className="text-sm font-medium">No matching subjects</p>
                  <p className="text-xs text-muted-foreground">
                    Try another subject or category.
                  </p>
                </div>
              )}
            </div>
            {(query || selectedSearch.length > 0) && (
              <div className="flex justify-end px-2 pb-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    onChange("", []);
                    setActiveSearch(null);
                    searchInputRef.current?.focus();
                  }}
                >
                  Clear filter
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
