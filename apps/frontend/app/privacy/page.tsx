import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Privacy Policy | Tiwder" };

export default function PrivacyPage() {
  return (
    <main lang="en" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="mb-8 flex w-fit items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Tiwder
      </Link>
      <Card>
        <CardHeader>
          <h1 className="text-3xl font-semibold">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: November 17, 2026</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 leading-relaxed">
          <p>Tiwder connects students and tutors and helps them arrange lessons. This page explains how information is used when you use Tiwder.</p>
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Information we collect</h2>
            <p>When you sign in with Google, we receive your Google account identifier, name, email address, and profile picture. We request basic identity, email, and profile permissions; we do not request access to your Gmail messages or Google Drive files.</p>
            <p>We also store the information you provide in your profile, including photos, phone number, biography, and student grade level or tutor education, experience, subjects, skill levels, and hourly rate. We store lesson requests, proposed times, confirmations, cancellations, and booking history.</p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">How we use and share information</h2>
            <p>We use this information to sign you in, maintain your account, display profiles, find tutors, arrange lessons, and protect account actions. Completed tutor profiles, including names and photos, are visible to visitors. Participants can see information associated with their lesson requests. Your email and phone number are shown to your lesson partner when a lesson is confirmed.</p>
            <p>Google processes sign-in information under its own privacy policy. Hosting, database, and network providers process information needed to operate the service. Payment and lesson arrangements take place outside Tiwder.</p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Cookies and storage</h2>
            <p>We use cookies to keep you signed in and secure the Google sign-in flow. Account, profile, and booking information is stored in the service database. Signing out removes your active session; it does not delete your account or booking records.</p>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Your choices and contact</h2>
            <p>You can browse tutors without signing in and edit your profile after signing in. You can remove Tiwder&apos;s Google connection in your Google account settings; this does not automatically delete information already stored by Tiwder.</p>
            <p>For questions about this policy or requests to access, correct, or delete your information, contact <a href="mailto:paitong1550@gmail.com" className="underline underline-offset-4">paitong1550@gmail.com</a>. Account deletion is currently handled through this contact rather than an in-app deletion button.</p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
