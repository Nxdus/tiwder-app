"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { SkillLevel, Subject } from "@/lib/api";
import { matchesSubjectName } from "@/lib/subject-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

const levels: SkillLevel[] = ["Beginner", "Intermediate", "Advanced"];

export default function TeachingSubjects({
  subjects,
  value,
  onChange,
  onEditingChange,
  disabled = false,
}: {
  subjects: Subject[];
  value: Record<string, SkillLevel>;
  onChange: (value: Record<string, SkillLevel>) => void;
  onEditingChange: (editing: boolean) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLButtonElement>(null);
  const visibleSubjects = subjects.filter((subject) => searchOpen
    ? matchesSubjectName(subject.name, query)
    : Boolean(value[subject.id]));

  useEffect(() => {
    if (editingSubject) levelRef.current?.focus();
  }, [editingSubject]);

  useEffect(() => () => onEditingChange(false), [onEditingChange]);

  useEffect(() => {
    function closeSearch(event: PointerEvent) {
      if (event.target instanceof Node && !searchRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);

  function editSubject(subject: Subject | null) {
    setEditingSubject(subject);
    onEditingChange(Boolean(subject));
    if (!subject) {
      setQuery("");
      inputRef.current?.focus();
    }
    setSearchOpen(false);
  }

  function removeSubject(id: string) {
    const next = { ...value };
    delete next[id];
    onChange(next);
    if (editingSubject?.id === id) editSubject(null);
  }

  return (
    <FieldSet>
      <FieldLegend>Subjects you teach</FieldLegend>
      <FieldDescription id="teaching-subjects-description">
        Search for a subject, then choose your teaching level. Add at least one subject.
      </FieldDescription>
      <div
        ref={searchRef}
        className="flex min-w-0 flex-col gap-4"
        onBlur={(event) => {
          if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            inputRef.current?.focus();
            setSearchOpen(false);
          }
        }}
      >
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onFocus={() => setSearchOpen(true)}
            onClick={() => setSearchOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            aria-label="Search subjects you teach"
            aria-describedby="teaching-subjects-description"
            aria-controls={searchOpen || visibleSubjects.length ? "teaching-subject-results" : undefined}
            placeholder="Search subjects…"
            className="h-12 rounded-2xl pl-10"
            disabled={disabled}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
        </div>
        {(searchOpen || visibleSubjects.length > 0) && (
        <div id="teaching-subject-results" role="group" aria-label={searchOpen ? "Subjects you can teach" : "Selected teaching subjects"} className="flex max-h-[min(360px,50dvh)] flex-wrap content-start gap-2 overflow-y-auto overscroll-contain p-1 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent] [&::-webkit-scrollbar]:block [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-track]:bg-transparent">
          {visibleSubjects.map((subject) => (
            <div key={subject.id} className={`flex max-w-full items-center rounded-full ${value[subject.id] ? "border border-border bg-input/30" : ""}`}>
              <Button
                type="button"
                variant={value[subject.id] ? "ghost" : "outline"}
                aria-pressed={Boolean(value[subject.id])}
                aria-label={value[subject.id] ? `Edit teaching level for ${subject.name}: ${value[subject.id]}` : `Choose teaching level for ${subject.name}`}
                disabled={disabled}
                className={`h-auto min-h-10 min-w-0 shrink gap-2 rounded-full px-4 py-2 whitespace-normal text-left ${value[subject.id] ? "rounded-r-none pr-2" : ""}`}
                onClick={() => editSubject(subject)}
              >
                <span className="min-w-0 break-words">{subject.name}</span>
                {value[subject.id] && <span className="text-xs text-muted-foreground">· {value[subject.id]}</span>}
              </Button>
              {value[subject.id] && (
                <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} className="mr-1" aria-label={`Remove ${subject.name}`} onClick={() => removeSubject(subject.id)}>
                  <X aria-hidden="true" className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
          {searchOpen && !visibleSubjects.length && (
            <p role="status" className="w-full px-4 py-6 text-center text-sm text-muted-foreground">
              {subjects.length ? "No matching subjects. Try another subject name." : "No subjects available yet. Please try again later."}
            </p>
          )}
        </div>
        )}
      </div>
      {editingSubject && (
        <Card size="sm" role="group" aria-labelledby="teaching-level-title">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <CardTitle>
                <h3 id="teaching-level-title" className="break-words">{editingSubject.name}</h3>
              </CardTitle>
              <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} aria-label="Cancel choosing teaching level" onClick={() => editSubject(null)}>
                <X aria-hidden="true" />
              </Button>
            </div>
            <CardDescription>Choose your teaching level to {value[editingSubject.id] ? "update" : "add"} this subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Teaching level for ${editingSubject.name}`}>
              {levels.map((level, index) => (
                <Button
                  key={level}
                  ref={index === 0 ? levelRef : undefined}
                  type="button"
                  variant={value[editingSubject.id] === level ? "default" : "outline"}
                  aria-pressed={value[editingSubject.id] === level}
                  disabled={disabled}
                  className="min-h-10"
                  onClick={() => {
                    onChange({ ...value, [editingSubject.id]: level });
                    editSubject(null);
                  }}
                >
                  {value[editingSubject.id] === level && <Check aria-hidden="true" />}
                  {level}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </FieldSet>
  );
}
