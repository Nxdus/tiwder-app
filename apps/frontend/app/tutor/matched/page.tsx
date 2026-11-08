import type { Metadata } from "next";

import { demoMatches } from "./demo-matches";
import TutorMatched from "./tutor-matched";

export const metadata: Metadata = {
  title: "Matched | Tiwder",
  description: "View confirmed student matches and their lesson status.",
};

export default function TutorMatchedPage() {
  return <TutorMatched matches={demoMatches} />;
}
