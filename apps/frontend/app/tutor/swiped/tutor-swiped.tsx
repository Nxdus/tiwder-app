import TutorHeader from "../_components/tutor-header";
import StudentCard from "../_components/student-card";
import { students } from "../time-slot/students";

export default function TutorSwiped() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-primary/5 p-4 text-foreground sm:p-8">
      <TutorHeader />
      <main aria-label="Swiped students" className="w-full max-w-[1070px]">
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,330px),330px))] justify-center gap-x-10 gap-y-[50px]">
          {students.map((student) => (
            <li key={student.id}>
              <StudentCard student={student} selectable />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
