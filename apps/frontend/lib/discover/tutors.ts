export type Tutor = {
  id: string;
  name: string;
  age?: number;
  avatarUrl: string | null;
  photos?: string[];
  school: string;
  rate: number;
  experience: string;
  about: string;
  subjects: { id: string; category: string; name: string; level: string }[];
};
export type SearchOption = {
  key: string;
  category: string;
  subject?: Tutor["subjects"][number];
};
