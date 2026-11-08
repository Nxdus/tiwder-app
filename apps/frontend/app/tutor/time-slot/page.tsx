import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import TutorTimeSlot from "./tutor-time-slot";
import { students } from "./students";
import { getBangkokDate } from "./schedule";

export const metadata: Metadata = {
  title: "Schedule teaching time | Tiwder",
  description: "Choose a teaching date and time for your selected student.",
};

async function SelectedStudent({ searchParams }: PageProps<"/tutor/time-slot">) {
  const { student: studentId } = await searchParams;
  const student = studentId === undefined
    ? students[0]
    : students.find((student) => student.id === studentId);

  if (!student) notFound();

  await connection();
  return <TutorTimeSlot key={student.id} student={student} today={getBangkokDate(new Date())} />;
}

export default function TutorTimeSlotPage(props: PageProps<"/tutor/time-slot">) {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-center">Loading student…</p>}>
      <SelectedStudent {...props} />
    </Suspense>
  );
}
