"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { session, refresh, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [role, setRole] = useState<Role>(session.user?.role ?? "student");
  const [teachings, setTeachings] = useState<Record<string, SkillLevel>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api<Profile>("/profile"), api<Subject[]>("/subjects")])
      .then(([next, catalog]) => {
        if (!active) return;
        setProfile(next);
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
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);
    const data = new FormData(event.currentTarget);
    const body = {
      role,
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
      if (onboarding) router.replace(roleHome(next.user?.role ?? null));
      else setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8">
      <Link
        href={roleHome(session.user?.role ?? null)}
        className="self-start text-sm underline underline-offset-4"
      >
        ← Back to Tiwder
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{onboarding ? "Complete your profile" : "Your profile"}</h1>
          </CardTitle>
          <CardDescription>
            {onboarding
              ? "Choose your role carefully. It cannot be changed later."
              : "Your role and Google email stay linked to this account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <p role="status" className="mb-4">
              Profile saved.
            </p>
          )}
          {!loaded ? (
            <p role="status">Loading profile…</p>
          ) : (
            <form id="profile-form" onSubmit={submit}>
              <FieldGroup>
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
                  <FieldLabel htmlFor="email">Google email</FieldLabel>
                  <Input
                    id="email"
                    value={profile?.email ?? session.user?.email ?? ""}
                    readOnly
                  />
                  <FieldDescription>
                    Your contact details are shared only with a confirmed lesson
                    partner.
                  </FieldDescription>
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
                      <FieldLabel htmlFor="education">Education</FieldLabel>
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
                        Choose at least one subject and your teaching level.
                      </FieldDescription>
                      <FieldGroup>
                        {subjects.map((subject) => (
                          <Field key={subject.id}>
                            <Field orientation="horizontal">
                              <Checkbox
                                id={`subject-${subject.id}`}
                                checked={Boolean(teachings[subject.id])}
                                onCheckedChange={(checked) =>
                                  setTeachings((previous) => {
                                    const next = { ...previous };
                                    if (checked) next[subject.id] = "Beginner";
                                    else delete next[subject.id];
                                    return next;
                                  })
                                }
                              />
                              <FieldLabel htmlFor={`subject-${subject.id}`}>
                                {subject.name}
                              </FieldLabel>
                            </Field>
                            {teachings[subject.id] && (
                              <>
                                <FieldLabel htmlFor={`level-${subject.id}`}>
                                  Teaching level for {subject.name}
                                </FieldLabel>
                                <Choice
                                  id={`level-${subject.id}`}
                                  value={teachings[subject.id]}
                                  onChange={(value) =>
                                    setTeachings((previous) => ({
                                      ...previous,
                                      [subject.id]: value as SkillLevel,
                                    }))
                                  }
                                  options={[
                                    "Beginner",
                                    "Intermediate",
                                    "Advanced",
                                  ].map((value) => ({ value, label: value }))}
                                />
                              </>
                            )}
                          </Field>
                        ))}
                      </FieldGroup>
                    </FieldSet>
                  </>
                )}
                <Field>
                  <FieldLabel htmlFor="bio">About you</FieldLabel>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={profile?.bio ?? ""}
                    required
                    maxLength={2000}
                    rows={4}
                  />
                </Field>
              </FieldGroup>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button
            type="submit"
            form="profile-form"
            disabled={
              !loaded ||
              saving ||
              (role === "tutor" && !Object.keys(teachings).length)
            }
          >
            {saving
              ? "Saving…"
              : onboarding
                ? "Start using Tiwder"
                : "Save profile"}
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void logout().catch((cause) => {
                setError(cause.message);
                setSaving(false);
              });
            }}
          >
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
