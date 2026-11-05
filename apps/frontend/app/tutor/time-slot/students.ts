export type Student = {
  id: string;
  name: string;
  photoUrl?: string;
  grade: string;
  phone: string;
  email: string;
  about: string;
  subject: string;
  level: string;
};

// shortcut: shared Figma fixtures, replace with API data when tutor scheduling is available.
export const students: Student[] = Array.from({ length: 6 }, (_, index) => ({
  id: `demo-student-${index + 1}`,
  name: "Stella Wilson",
  photoUrl: "/tutor/student-sample.png",
  grade: "G11",
  phone: "067-677-6767",
  email: "stella_wilson@mail.com",
  about: "17 Years old  student.",
  subject: "Python Programing",
  level: "Advance",
}));
