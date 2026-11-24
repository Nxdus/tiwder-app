export function matchesSubjectName(name: string, query: string) {
  const search = query.trim().toLowerCase().replace(/\s+/g, " ");
  const subjectName = name.trim().toLowerCase().replace(/\s+/g, " ");
  return subjectName.startsWith(search) || subjectName.includes(` ${search}`);
}
