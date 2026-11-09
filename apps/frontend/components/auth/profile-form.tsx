"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  GraduationCap,
  MessageSquare,
  Save,
  UserRound,
} from "lucide-react";
import ProfilePhotos from "./profile-photos";
import {
  api,
  roleHome,
  type Profile,
  type Role,
  type SkillLevel,
  type Subject,
} from "@/lib/api";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProfileSkeleton } from "@/components/loading/skeletons";

export function Choice({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next !== null && onChange(next)}
      disabled={disabled}
      items={options}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Choose…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default function ProfileForm({
  onboarding = false,
}: {
  onboarding?: boolean;
}) {
  const { session, refresh } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [role, setRole] = useState<Role>(session.user?.role ?? "student");
  const [teachings, setTeachings] = useState<Record<string, SkillLevel>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api<Profile>("/profile"), api<Subject[]>("/subjects")])
      .then(([next, catalog]) => {
        if (!active) return;
        setProfile(next);
        setPhotos(next.photos ?? []);
        setSubjects(catalog);
        setRole(next.role ?? "student");
        setTeachings(
          Object.fromEntries(
            (next.teachings ?? []).map((t) => [t.subjectId, t.skillLevel]),
          ),
        );
        setLoaded(true);
      })
      .catch((cause) => {
        if (!active) return;
        setLoadError(cause instanceof Error ? cause.message : "Unable to load profile.");
        toast.add({
          title: "Unable to load profile",
          description:
            cause instanceof Error ? cause.message : "Please try again.",
          type: "error",
          timeout: 0,
          actionProps: {
            children: "Try again",
            onClick: () => window.location.reload(),
          },
        });
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || preparingPhotos) return;
    setSaving(true);
    const savingToast = toast.add({
      title: "Saving profile…",
      type: "loading",
      timeout: 0,
    });
    const data = new FormData(event.currentTarget);
    const body = {
      role,
      photos,
      name: data.get("name"),
      phone: data.get("phone"),
      bio: data.get("bio"),
      ...(role === "student"
        ? { gradeLevel: data.get("gradeLevel") }
        : {
            education: data.get("education"),
            experienceYears: Number(data.get("experienceYears")),
            hourlyRate: Number(data.get("hourlyRate")),
            teachings: Object.entries(teachings).map(
              ([subjectId, skillLevel]) => ({ subjectId, skillLevel }),
            ),
          }),
    };
    try {
      await api(
        onboarding ? "/onboarding" : "/profile",
        { method: onboarding ? "POST" : "PATCH", body: JSON.stringify(body) },
        session.csrfToken,
      );
      const next = await refresh();
      toast.update(savingToast, {
        title: "Profile saved",
        type: "success",
        timeout: 5000,
      });
      if (onboarding) router.replace(roleHome(next.user?.role ?? null));
    } catch (cause) {
      toast.update(savingToast, {
        title: "Unable to save profile",
        description:
          cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
        timeout: 5000,
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <Link
          href={roleHome(session.user?.role ?? null)}
          className="flex items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Tiwder
        </Link>
        {!loaded ? loadError ? (
          <div className="flex flex-col items-start gap-4">
            <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
            <Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>
          </div>
        ) : <ProfileSkeleton tutor={role === "tutor"} /> : (
        <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
          <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-8">
            <ProfilePhotos
              photos={photos}
              disabled={!loaded || saving}
              onBusyChange={setPreparingPhotos}
              onChange={setPhotos}
            />
          </aside>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>
                <h1>Profile details</h1>
              </CardTitle>
              {onboarding && (
                <CardDescription>
                  Choose your role carefully. It cannot be changed later.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loaded && (
                <form id="profile-form" onSubmit={submit}>
                  <fieldset disabled={saving} className="min-w-0">
                    <FieldGroup>
                      <FieldSet>
                        <FieldLegend className="mb-4 flex items-center gap-2">
                          <UserRound className="size-4" />
                          The basics
                        </FieldLegend>
                        <FieldGroup className="grid gap-5 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="role">Role</FieldLabel>
                            <Choice
                              id="role"
                              value={role}
                              onChange={(value) => setRole(value as Role)}
                              disabled={Boolean(profile?.role)}
                              options={[
                                { value: "student", label: "Student" },
                                { value: "tutor", label: "Tutor" },
                              ]}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="email">
                              Google email
                            </FieldLabel>
                            <Input
                              id="email"
                              value={
                                profile?.email ?? session.user?.email ?? ""
                              }
                              readOnly
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="name">Full name</FieldLabel>
                            <Input
                              id="name"
                              name="name"
                              defaultValue={profile?.name ?? session.user?.name}
                              required
                              maxLength={120}
                              autoComplete="name"
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="phone">Phone</FieldLabel>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              defaultValue={profile?.phone ?? ""}
                              required
                              maxLength={30}
                              autoComplete="tel"
                            />
                          </Field>
                        </FieldGroup>
                      </FieldSet>
                      <FieldSet className="pt-4">
                        <FieldLegend className="mb-0 flex items-center gap-2">
                          <GraduationCap className="size-4" />
                          {role === "student"
                            ? "Your learning journey"
                            : "Your teaching journey"}
                        </FieldLegend>
                        <FieldGroup className="gap-5">
                          {role === "student" ? (
                            <Field>
                              <FieldLabel htmlFor="gradeLevel">
                                Grade / education level
                              </FieldLabel>
                              <Input
                                id="gradeLevel"
                                name="gradeLevel"
                                defaultValue={profile?.gradeLevel ?? ""}
                                placeholder="e.g. Grade 11 or University"
                                required
                                maxLength={100}
                              />
                            </Field>
                          ) : (
                            <>
                              <Field>
                                <FieldLabel htmlFor="education">
                                  Education
                                </FieldLabel>
                                <Input
                                  id="education"
                                  name="education"
                                  defaultValue={profile?.education ?? ""}
                                  required
                                  maxLength={200}
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="experienceYears">
                                  Years of teaching experience
                                </FieldLabel>
                                <Input
                                  id="experienceYears"
                                  name="experienceYears"
                                  type="number"
                                  min="0"
                                  max="80"
                                  step="1"
                                  defaultValue={profile?.experienceYears ?? 0}
                                  required
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="hourlyRate">
                                  Hourly rate (THB)
                                </FieldLabel>
                                <Input
                                  id="hourlyRate"
                                  name="hourlyRate"
                                  type="number"
                                  min="1"
                                  max="100000"
                                  step="0.01"
                                  defaultValue={profile?.hourlyRate ?? ""}
                                  required
                                />
                                <FieldDescription>
                                  Payment is arranged outside Tiwder.
                                </FieldDescription>
                              </Field>
                              <FieldSet>
                                <FieldLegend>Subjects you teach</FieldLegend>
                                <FieldDescription>
                                  Choose at least one subject and your teaching
                                  level.
                                </FieldDescription>
                                <FieldGroup>
                                  {subjects.map((subject) => (
                                    <Field key={subject.id}>
                                      <Field orientation="horizontal">
                                        <Checkbox
                                          id={`subject-${subject.id}`}
                                          checked={Boolean(
                                            teachings[subject.id],
                                          )}
                                          onCheckedChange={(checked) =>
                                            setTeachings((previous) => {
                                              const next = { ...previous };
                                              if (checked)
                                                next[subject.id] = "Beginner";
                                              else delete next[subject.id];
                                              return next;
                                            })
                                          }
                                        />
                                        <FieldLabel
                                          htmlFor={`subject-${subject.id}`}
                                        >
                                          {subject.name}
                                        </FieldLabel>
                                      </Field>
                                      {teachings[subject.id] && (
                                        <>
                                          <FieldLabel
                                            htmlFor={`level-${subject.id}`}
                                          >
                                            Teaching level for {subject.name}
                                          </FieldLabel>
                                          <Choice
                                            id={`level-${subject.id}`}
                                            value={teachings[subject.id]}
                                            onChange={(value) =>
                                              setTeachings((previous) => ({
                                                ...previous,
                                                [subject.id]:
                                                  value as SkillLevel,
                                              }))
                                            }
                                            options={[
                                              "Beginner",
                                              "Intermediate",
                                              "Advanced",
                                            ].map((value) => ({
                                              value,
                                              label: value,
                                            }))}
                                          />
                                        </>
                                      )}
                                    </Field>
                                  ))}
                                </FieldGroup>
                              </FieldSet>
                            </>
                          )}
                        </FieldGroup>
                      </FieldSet>
                      <FieldSet className="pt-4">
                        <FieldLegend className="mb-0 flex items-center gap-2">
                          <MessageSquare className="size-4" />A little about you
                        </FieldLegend>
                        <Field>
                          <FieldLabel htmlFor="bio">About you</FieldLabel>
                          <Textarea
                            id="bio"
                            name="bio"
                            defaultValue={profile?.bio ?? ""}
                            required
                            maxLength={2000}
                            rows={6}
                            className="min-h-40 resize-y"
                            placeholder={
                              role === "student"
                                ? "I’m excited to learn…"
                                : "A great lesson starts with…"
                            }
                          />
                        </Field>
                      </FieldSet>
                    </FieldGroup>
                  </fieldset>
                </form>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
              <Button
                type="submit"
                form="profile-form"
                disabled={
                  !loaded ||
                  saving ||
                  preparingPhotos ||
                  (role === "tutor" && !Object.keys(teachings).length)
                }
              >
                <Save data-icon="inline-start" />
                {saving
                  ? "Saving…"
                  : onboarding
                    ? "Start using Tiwder"
                    : "Save changes"}
              </Button>
            </CardFooter>
          </Card>
        </div>
        )}
      </div>
    </main>
  );
}
