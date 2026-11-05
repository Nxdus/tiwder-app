import type { Metadata } from "next";

import TutorSwiped from "./tutor-swiped";

export const metadata: Metadata = {
  title: "Swiped | Tiwder",
  description: "View students who have swiped on your tutor profile.",
};

export default function TutorSwipedPage() {
  return <TutorSwiped />;
}
