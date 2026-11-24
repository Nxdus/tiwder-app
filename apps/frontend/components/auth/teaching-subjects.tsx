"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { api, type SkillLevel, type Subject } from "@/lib/api";
import { matchesSubjectName } from "@/lib/subject-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

const levels: SkillLevel[] = ["Beginner", "Intermediate", "Advanced"];
const levelOptions = levels.map((level) => ({ value: level, label: level }));
const DEFAULT_LEVEL: SkillLevel = "Intermediate";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export default function TeachingSubjects({
  subjects,
  value,
  onChange,
  onSubjectCreated,
  csrfToken,
  disabled = false,
}: {
  subjects: Subject[];
  value: Record<string, SkillLevel>;
  onChange: (value: Record<string, SkillLevel>) => void;
  onSubjectCreated: (subject: Subject) => void;
  csrfToken?: string;
  disabled?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategoryId, setCustomCategoryId] = useState<string>("other");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const selectedSubjects = useMemo(
    () => subjects.filter((subject) => Boolean(value[subject.id])),
    [subjects, value],
  );

  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const subject of subjects) {
      for (const category of subject.categories) {
        if (!map.has(category.id) && category.name.toLowerCase() !== "other") {
          map.set(category.id, category.name);
        }
      }
    }
    return [
      { value: "other", label: "Other" },
      ...[...map.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [subjects]);

  const trimmedQuery = normalizeName(query);

  const filteredSubjects = useMemo(() => {
    if (!trimmedQuery) return subjects;
    return subjects.filter(
      (subject) =>
        matchesSubjectName(subject.name, trimmedQuery) ||
        subject.categories.some((category) =>
          matchesSubjectName(category.name, trimmedQuery),
        ),
    );
  }, [subjects, trimmedQuery]);

  const hasExactMatch = useMemo(() => {
    if (!trimmedQuery) return false;
    const target = trimmedQuery.toLowerCase();
    return subjects.some(
      (subject) => normalizeName(subject.name).toLowerCase() === target,
    );
  }, [subjects, trimmedQuery]);

  function openModal() {
    setDraftIds(new Set(Object.keys(value)));
    setQuery("");
    setCustomOpen(false);
    setCustomName("");
    setCustomCategoryId("other");
    setCreateError("");
    setModalOpen(true);
  }

  function toggleDraft(id: string, checked: boolean) {
    setDraftIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function confirmSelection() {
    const next: Record<string, SkillLevel> = {};
    for (const id of draftIds) {
      next[id] = value[id] ?? DEFAULT_LEVEL;
    }
    onChange(next);
    setModalOpen(false);
  }

  function removeSubject(id: string) {
    const next = { ...value };
    delete next[id];
    onChange(next);
  }

  function changeLevel(id: string, level: SkillLevel) {
    onChange({ ...value, [id]: level });
  }

  async function createCustomSubject(rawName: string, categoryId?: string) {
    const name = normalizeName(rawName);
    if (!name || creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const payload: { name: string; categoryId?: string } = { name };
      if (categoryId && categoryId !== "other") {
        payload.categoryId = categoryId;
      }
      const created = await api<Subject>(
        "/subjects",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        csrfToken,
      );
      onSubjectCreated(created);
      setDraftIds((previous) => {
        const next = new Set(previous);
        next.add(created.id);
        return next;
      });
      setCustomName("");
      setCustomOpen(false);
      setQuery("");
      toast.add({
        title: "Subject added",
        description: `${created.name} is selected in your list.`,
        type: "success",
      });
    } catch (cause) {
      setCreateError(
        cause instanceof Error ? cause.message : "Unable to add subject.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <FieldSet>
      <FieldLegend>Subjects you teach</FieldLegend>
      <FieldDescription id="teaching-subjects-description">
        Add the subjects you teach and set your level for each. At least one subject is required.
      </FieldDescription>

      <div className="flex flex-col gap-3">
        {selectedSubjects.length > 0 && (
          <div
            role="list"
            aria-label="Selected teaching subjects"
            className="flex flex-wrap items-center gap-2"
          >
            {selectedSubjects.map((subject) => (
              <Badge
                key={subject.id}
                variant="outline"
                render={<div role="listitem" />}
                className="h-auto max-w-full gap-1.5 py-1 pr-1 pl-3 text-sm font-normal"
              >
                <span className="min-w-0 truncate font-medium">
                  {subject.name}
                </span>
                <Select
                  value={value[subject.id]}
                  onValueChange={(next) => {
                    if (next) changeLevel(subject.id, next as SkillLevel);
                  }}
                  items={levelOptions}
                  disabled={disabled}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label={`Teaching level for ${subject.name}`}
                    className="h-6 gap-1 rounded-full border-transparent bg-secondary px-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  disabled={disabled}
                  aria-label={`Remove ${subject.name}`}
                  className="rounded-full"
                  onClick={() => removeSubject(subject.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={openModal}
            aria-describedby="teaching-subjects-description"
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add subject
          </Button>
        </div>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(next) => {
          if (!creating) setModalOpen(next);
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select subjects</DialogTitle>
            <DialogDescription>
              Search and select subjects you teach, or add a custom subject.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              aria-label="Search subjects"
              placeholder="Search subjects…"
              className="pl-9 pr-9"
              disabled={creating}
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => setQuery("")}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>

          <div
            role="group"
            aria-label="Available subjects"
            className="flex min-h-40 max-h-[38dvh] flex-col gap-1 overflow-y-auto overscroll-contain rounded-2xl border border-border p-2 [scrollbar-gutter:stable]"
          >
            {filteredSubjects.map((subject) => {
              const checked = draftIds.has(subject.id);
              const categoryText = subject.categories
                .map((category) => category.name)
                .join(", ");
              return (
                <label
                  key={subject.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 has-data-checked:bg-muted/80"
                >
                  <Checkbox
                    checked={checked}
                    disabled={creating}
                    onCheckedChange={(next) => toggleDraft(subject.id, Boolean(next))}
                  />
                  <span className="min-w-0 flex-1 break-words font-medium">
                    {subject.name}
                  </span>
                  {categoryText && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {categoryText}
                    </span>
                  )}
                </label>
              );
            })}

            {!filteredSubjects.length && (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {trimmedQuery
                    ? `No subjects matching "${trimmedQuery}".`
                    : "No subjects available yet."}
                </p>
                {trimmedQuery && !hasExactMatch && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={creating}
                    onClick={() => createCustomSubject(trimmedQuery)}
                  >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    {creating ? "Adding…" : `Add "${trimmedQuery}"`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3">
            {!customOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Can&apos;t find your subject?
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={creating}
                  onClick={() => {
                    setCustomName(trimmedQuery && !hasExactMatch ? trimmedQuery : "");
                    setCreateError("");
                    setCustomOpen(true);
                  }}
                >
                  <Plus data-icon="inline-start" aria-hidden="true" />
                  Add custom subject
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customName}
                    onChange={(event) => {
                      setCustomName(event.target.value);
                      if (createError) setCreateError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void createCustomSubject(customName, customCategoryId);
                      }
                    }}
                    aria-label="Custom subject name"
                    aria-invalid={Boolean(createError) || undefined}
                    placeholder="Enter subject name…"
                    maxLength={100}
                    disabled={creating}
                    className="flex-1"
                  />
                  <Select
                    value={customCategoryId}
                    onValueChange={(next) => {
                      if (next) setCustomCategoryId(next);
                    }}
                    items={categoryOptions}
                    disabled={creating}
                  >
                    <SelectTrigger
                      aria-label="Custom subject category"
                      className="w-full sm:w-44"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                {createError && (
                  <p role="alert" className="text-xs text-destructive">
                    {createError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={creating}
                    onClick={() => {
                      setCustomOpen(false);
                      setCreateError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={creating || !normalizeName(customName)}
                    onClick={() =>
                      void createCustomSubject(customName, customCategoryId)
                    }
                  >
                    {creating ? "Adding…" : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="items-center">
            <span className="text-xs text-muted-foreground sm:mr-auto">
              {draftIds.size} selected
            </span>
            <DialogClose
              disabled={creating}
              render={<Button type="button" variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              type="button"
              disabled={creating}
              onClick={confirmSelection}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FieldSet>
  );
}
