"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleAlert,
  Clock,
  Gauge,
  BadgeDollarSign,
  GraduationCap,
  Heart,
  Info,
  Search,
  Timer,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Tutor = {
  name: string;
  age: number;
  school: string;
  rate: number;
  experience: string;
  about: string;
  subjects: { category: string; name: string; level: string }[];
  colors: string;
};

const tutors: Tutor[] = [
  { name: "Mali S.", age: 23, school: "Computer Science, KMUTT", rate: 250, experience: "2 years", about: "สอนพื้นฐาน Programming และอธิบายแบบเป็นขั้นตอน เหมาะกับคนที่อยากเริ่มจากศูนย์", subjects: [{ category: "Computer Science", name: "Python Programming", level: "Advanced" }, { category: "Mathematics", name: "Calculus", level: "Intermediate" }], colors: "from-violet-500 via-fuchsia-400 to-amber-300" },
  { name: "Narin P.", age: 25, school: "Engineering, Chulalongkorn", rate: 300, experience: "3 years", about: "ติวคณิตศาสตร์และฟิสิกส์ด้วยโจทย์จริง พร้อมสรุปสูตรที่จำเป็นก่อนสอบ", subjects: [{ category: "Mathematics", name: "Linear Algebra", level: "Advanced" }, { category: "Mathematics", name: "Calculus", level: "Advanced" }, { category: "Physics", name: "Mechanics", level: "Intermediate" }], colors: "from-sky-500 via-cyan-400 to-emerald-300" },
  { name: "Pim K.", age: 22, school: "Arts, Thammasat University", rate: 220, experience: "2 years", about: "ช่วยให้พูดและเขียนภาษาอังกฤษมั่นใจขึ้น ปรับบทเรียนตามเป้าหมายของผู้เรียน", subjects: [{ category: "Languages", name: "English Conversation", level: "Intermediate" }, { category: "Languages", name: "Academic Writing", level: "Advanced" }], colors: "from-rose-400 via-orange-300 to-yellow-200" },
  { name: "Tee W.", age: 24, school: "ICT, Mahidol University", rate: 280, experience: "4 years", about: "สอนเขียนเว็บและเตรียม Portfolio โดยเน้นทำโปรเจกต์จริงไปพร้อมกัน", subjects: [{ category: "Computer Science", name: "Web Development", level: "Advanced" }, { category: "Computer Science", name: "Python Programming", level: "Intermediate" }], colors: "from-indigo-500 via-blue-400 to-teal-300" },
];

const choices = tutors
  .flatMap((tutor) => tutor.subjects)
  .filter((subject, index, subjects) => subjects.findIndex((item) => item.name === subject.name && item.category === subject.category) === index);

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tab, setTab] = useState("Discover");
  const [offered, setOffered] = useState<{ tutor: Tutor; subjects: string[] }[]>([]);
  const [matched, setMatched] = useState<{ tutor: Tutor; subjects: string[] }[]>([]);
  const [confirmation, setConfirmation] = useState<"accept" | "reject" | null>(null);
  const [selectedSearch, setSelectedSearch] = useState<Tutor["subjects"][number] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openedTutor, setOpenedTutor] = useState<Tutor | null>(null);
  const [pendingTutor, setPendingTutor] = useState<Tutor | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResettingCard, setIsResettingCard] = useState(false);
  const [cardVersion, setCardVersion] = useState(0);
  const startX = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const matchingTutors = useMemo(() => {
    const term = (filter ?? query).toLowerCase();
    return term ? tutors.filter((tutor) => tutor.subjects.some((subject) => [subject.name, subject.category].some((value) => value.toLowerCase().includes(term)))) : tutors;
  }, [filter, query]);
  const deck = matchingTutors.length ? matchingTutors : tutors;
  const tutor = openedTutor ?? deck[currentIndex % deck.length];
  const suggestions = choices.filter((subject) => [subject.name, subject.category].some((value) => value.toLowerCase().includes(query.toLowerCase()))).slice(0, 6);
  const groupedSubjects = tutor.subjects.reduce<Record<string, Tutor["subjects"]>>((groups, subject) => {
    (groups[subject.category] ??= []).push(subject);
    return groups;
  }, {});

  function advance(direction: "left" | "right") {
    if (direction === "right") { dragXRef.current = 0; setDragX(0); setPendingTutor(tutor); setSelectedSubjects([]); setMatchOpen(true); return; }
    setDetails(false);
    const exitPosition = direction === "left" ? -900 : 900;
    dragXRef.current = exitPosition;
    setDragX(exitPosition);
    window.setTimeout(() => {
      setIsResettingCard(true);
      setCurrentIndex((index) => {
        if (deck.length < 2) return 0;
        const current = index % deck.length;
        const random = Math.floor(Math.random() * (deck.length - 1));
        return random >= current ? random + 1 : random;
      });
      setCardVersion((version) => version + 1);
      dragXRef.current = 0;
      setDragX(0);
      requestAnimationFrame(() => setIsResettingCard(false));
    }, 240);
  }

  function finishDrag() {
    if (startX.current === null) return;
    const distance = dragXRef.current;
    startX.current = null;
    setIsDragging(false);
    if (Math.abs(distance) >= 90) advance(distance < 0 ? "left" : "right");
    else {
      dragXRef.current = 0;
      setDragX(0);
    }
  }

  function chooseSuggestion(subject: Tutor["subjects"][number]) {
    setSelectedSearch(subject);
    setFilter(subject.name);
    setQuery("");
    setSearchOpen(false);
    setCurrentIndex(0);
  }

  function resolveOffer() {
    if (!openedTutor || !confirmation) return;
    const offer = offered.find((item) => item.tutor.name === openedTutor.name);
    if (!offer) return;
    if (confirmation === "accept") setMatched((items) => [...items.filter((item) => item.tutor.name !== openedTutor.name), offer]);
    setOffered((items) => items.filter((item) => item.tutor.name !== openedTutor.name));
    setConfirmation(null);
    setOpenedTutor(null);
    setDetails(false);
    setTab(confirmation === "accept" ? "Matched" : "Offered");
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-white px-5 py-8 text-black sm:px-8 lg:px-12">
      <header className="mx-auto grid max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Tiwder</h1>
        <nav className="flex items-center gap-2" aria-label="Main navigation">
          {["Discover", "Offered", "Matched"].map((item) => (
            <Button key={item} onClick={() => { setTab(item); setOpenedTutor(null); setDetails(false); }} variant="secondary" className={`h-[33px] px-4 text-sm text-black ${tab === item ? "bg-[#b1b1b1]" : "bg-[#d9d9d9]"}`}>{item}</Button>
          ))}
        </nav>
        <Button variant="secondary" size="icon" className="justify-self-end" aria-label="Profile"><UserRound /></Button>
      </header>

      {!openedTutor && !details && <section className="mx-auto mt-8 w-full max-w-[352px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-2 size-4" />
          {selectedSearch && !searchOpen ? <button type="button" onClick={() => setSearchOpen(true)} className="flex min-h-8 w-full items-center gap-2 rounded-2xl bg-[#d9d9d9] py-2 pl-10 pr-4 text-left text-xs"><span>{selectedSearch.name}</span><span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-black" /><span className="font-semibold">{selectedSearch.category}</span></button> : <input value={query} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} onChange={(event) => { setQuery(event.target.value); setFilter(null); setSelectedSearch(null); setCurrentIndex(0); }} placeholder="Find something you want to study..." aria-label="Search subjects or categories" className="h-8 w-full rounded-2xl bg-[#d9d9d9] pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-zinc-400" />}
          {searchOpen && <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl bg-[#d9d9d9] p-2 shadow-lg">
            {Array.from(new Set(suggestions.map((subject) => subject.category))).map((category) => <div key={category}><button type="button" onClick={() => { setFilter(category); setQuery(category); setSelectedSearch(null); setSearchOpen(false); }} className="w-full px-1 text-left text-xs font-bold">{category}</button>{suggestions.filter((subject) => subject.category === category).map((subject) => <button type="button" key={subject.name} onClick={() => chooseSuggestion(subject)} className={`block w-full rounded-full px-1 py-0.5 text-left text-xs hover:bg-[#b1b1b1] ${selectedSearch?.name === subject.name ? "bg-[#b1b1b1]" : ""}`}>{subject.name}</button>)}</div>)}
            {!suggestions.length && <p className="p-2 text-xs">No matching subjects</p>}
            <button type="button" onClick={() => { setFilter(null); setQuery(""); setSelectedSearch(null); setSearchOpen(false); }} className="mt-2 text-xs underline">Clear filter</button>
          </div>}
        </div>
      </section>}

      {tab !== "Discover" && !openedTutor ? <section className="mx-auto mt-8 grid max-w-[520px] grid-cols-1 gap-8 sm:grid-cols-3" aria-label="Offered tutors">
        {(tab === "Offered" ? offered : matched).filter((offer) => !(filter ?? query) || offer.tutor.subjects.some((subject) => `${subject.name} ${subject.category}`.toLowerCase().includes((filter ?? query).toLowerCase()))).map((offer) => <button type="button" key={offer.tutor.name} onClick={() => { setOpenedTutor(offer.tutor); setDetails(true); }} className="relative aspect-[152/270] overflow-hidden rounded-2xl bg-[#d9d9d9] text-left">
          <TutorPhoto tutor={offer.tutor} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-12 text-white"><p className="text-sm font-semibold">{offer.tutor.name} <span className="ml-1 font-normal">{offer.tutor.age}</span></p><p className="mt-2 flex items-center gap-1 text-[10px]"><CalendarDays className="size-3" />Schedule not set</p><p className="mt-1 flex items-center gap-1 text-[10px]"><Clock className="size-3" />Awaiting tutor response</p></div>
        </button>)}
        {((tab === "Matched" ? matched : offered).length === 0) && <p className="col-span-full py-16 text-center text-sm text-zinc-500">{tab === "Matched" ? "No matched tutors yet." : "Your confirmed tutors will appear here."}</p>}
      </section> : <section className="mx-auto mt-8 w-full max-w-[330px]" aria-label="Discover tutors">
        {details && <Button variant="ghost" onClick={() => { setDetails(false); setOpenedTutor(null); }} className="mb-4 h-auto justify-start gap-2 p-0 text-sm font-normal"><ArrowLeft className="size-4" />Back to {openedTutor ? tab.toLowerCase() : "discover"}</Button>}
        <div className="[perspective:1400px]">
          <div
            className={`relative touch-pan-y select-none [transform-style:preserve-3d] ${isDragging ? "cursor-grabbing" : isResettingCard ? "cursor-grab" : details ? "cursor-default transition-transform duration-500" : "cursor-grab transition-transform duration-500"}`}
            style={{ transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)` }}
            onPointerDown={(event) => { if (!details) { startX.current = event.clientX; setIsDragging(true); event.currentTarget.setPointerCapture(event.pointerId); } }}
            onPointerMove={(event) => { if (startX.current !== null) { const distance = event.clientX - startX.current; dragXRef.current = distance; setDragX(distance); } }}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <div key={cardVersion} className="[animation:card-enter_520ms_cubic-bezier(.22,1.28,.36,1)_both]">
            <article className={`relative h-[587px] overflow-hidden rounded-2xl bg-[#d9d9d9] transition-transform duration-700 [backface-visibility:hidden] ${details ? "[transform:rotateY(180deg)]" : ""}`}>
              <TutorPhoto tutor={tutor} />
              <Carousel />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-20 text-white">
                <h2 className="text-2xl font-semibold">{tutor.name} <span className="ml-3 font-normal">{tutor.age}</span></h2>
                <p className="mt-2 flex items-center gap-2 text-sm"><GraduationCap className="size-5" />{tutor.school}</p>
                <p className="mt-2 flex items-center gap-2 text-sm"><BadgeDollarSign className="size-5" />฿ {tutor.rate} / hr</p>
                <div className="mt-2 flex flex-wrap gap-2">{tutor.subjects.map((subject) => <span key={subject.name} className="rounded-full bg-white/30 px-2 py-1 text-[10px]">{subject.name}</span>)}</div>
              </div>
            </article>

            <article inert={!details} style={{ transform: details ? "rotateY(0deg)" : "rotateY(180deg)" }} className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-[#f3f3f3] transition-transform duration-700 [backface-visibility:hidden]">
              <div className="relative h-[230px] shrink-0 overflow-hidden"><TutorPhoto tutor={tutor} /><Carousel />{openedTutor && <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2 text-[10px]"><span className="flex items-center gap-1 rounded-full bg-[#aeaeb2] px-2 py-1"><Clock className="size-4" />Schedule not set</span><span className="rounded-full bg-[#aeaeb2] px-2 py-1">฿ {tutor.rate}</span></div>}</div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[10px]">
                <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{tutor.name} <span className="ml-2 font-normal">{tutor.age}</span></h2>{openedTutor && <span className="flex items-center gap-1 rounded-full bg-[#aeaeb2] px-1.5 text-[10px] font-semibold"><CircleAlert className="size-3" />{tab === "Matched" ? "Confirmed" : "Pending"}</span>}</div>
                <div className="mt-3 space-y-3">
                  <p className="flex items-center gap-2"><GraduationCap className="size-4" />{tutor.school}</p>
                  <p className="flex items-center gap-2"><BadgeDollarSign className="size-4" />฿ {tutor.rate} / hour</p>
                  <p className="flex items-center gap-2"><Timer className="size-4" />{tutor.experience}</p>
                </div>
                <div className="my-4 border-t border-black" />
                <h3 className="text-base font-semibold">About</h3>
                <p className="mt-2 leading-relaxed">{tutor.about}</p>
                <div className="my-4 border-t border-black" />
                <h3 className="text-base font-semibold">Subject</h3>
                {tutor.subjects.filter((subject) => !openedTutor || (tab === "Matched" ? matched : offered).find((item) => item.tutor.name === tutor.name)?.subjects.includes(subject.name)).map((subject) => <div key={subject.name} className="mt-3"><p className="text-xs font-medium">{subject.name}</p><p className="mt-1 flex items-center gap-1"><Gauge className="size-4" />{subject.level}</p></div>)}
              </div>
            </article>
            </div>
          </div>
        </div>
        {openedTutor ? tab === "Offered" && <div className="mt-8 flex justify-between px-3"><Button variant="secondary" aria-label="Reject offer" onClick={() => setConfirmation("reject")} className="h-16 w-[120px] rounded-full bg-[#d9d9d9] text-black"><X className="size-12" /></Button><Button variant="secondary" aria-label="Accept offer" onClick={() => setConfirmation("accept")} className="h-16 w-[120px] rounded-full bg-[#d9d9d9] text-black"><Check className="size-12" /></Button></div> : <div className="mx-auto mt-4 flex w-[288px] items-center justify-between">
          <Button onClick={() => advance("left")} variant="secondary" size="icon-lg" className="size-16 bg-[#d9d9d9] text-black" aria-label="Pass tutor"><X className="size-8" /></Button>
          <Button onClick={() => setDetails(true)} variant="secondary" size="icon-lg" className="size-16 bg-[#d9d9d9] text-black" aria-label="Show details"><Info className="size-7" /></Button>
          <Button onClick={() => advance("right")} variant="secondary" size="icon-lg" className="size-16 bg-[#d9d9d9] text-black" aria-label="Match with tutor"><Heart className="size-8" /></Button>
        </div>}
      </section>}

      <Dialog.Root open={confirmation !== null} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
        <Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-30 bg-white/20 backdrop-blur-sm" /><Dialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-5"><Dialog.Popup className="w-full max-w-[410px] rounded-2xl bg-white px-5 pb-4 pt-8 shadow-[0_4px_4px_#00000040] outline-none">
          <Dialog.Title className="text-lg font-semibold">{confirmation === "reject" ? "Decline this match?" : "Accept this match?"}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[13px] leading-4 text-[#8e8e93]">{confirmation === "reject" ? "Are you sure you want to decline this offer from your tutor? This offer will be removed." : "Are you sure you want to confirm this match with your tutor? Your tutoring session will be confirmed."}</Dialog.Description>
          <div className="mt-10 flex justify-end gap-2"><Dialog.Close className="rounded-lg border border-[#d4d4d4] px-2 py-1 text-sm">Cancel</Dialog.Close><Button onClick={resolveOffer} className="h-auto rounded-lg bg-black px-2 py-1 text-sm text-white hover:bg-black/80">{confirmation === "reject" ? "Decline Match" : "Confirm Match"}</Button></div>
        </Dialog.Popup></Dialog.Viewport></Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={matchOpen} onOpenChange={setMatchOpen}><Dialog.Portal><Dialog.Backdrop className="fixed inset-0 z-20 bg-zinc-950/35 backdrop-blur-sm" /><Dialog.Viewport className="fixed inset-0 z-30 flex items-center justify-center p-5"><Dialog.Popup className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl outline-none"><Dialog.Title className="text-2xl font-bold">Choose subject</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-zinc-500">Select the subjects you&apos;d like to study with {tutor.name}.</Dialog.Description><div className="mt-6 max-h-64 space-y-5 overflow-y-auto">{Object.entries(groupedSubjects).map(([category, subjects]) => <fieldset key={category}><legend className="mb-2 font-semibold">{category}</legend>{subjects.map((subject) => <label key={subject.name} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm"><input type="checkbox" checked={selectedSubjects.includes(subject.name)} onChange={() => setSelectedSubjects((selected) => selected.includes(subject.name) ? selected.filter((name) => name !== subject.name) : [...selected, subject.name])} className="size-4 accent-zinc-900" />{subject.name}</label>)}</fieldset>)}</div><div className="mt-8 flex justify-end gap-3"><Dialog.Close className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100">Cancel</Dialog.Close><button type="button" onClick={() => { setOffered((items) => [...items.filter((item) => item.tutor.name !== (pendingTutor ?? tutor).name), { tutor: pendingTutor ?? tutor, subjects: [...selectedSubjects] }]); setMatchOpen(false); setSelectedSubjects([]); setOpenedTutor(null); setDetails(false); setQuery(""); setFilter(null); setSelectedSearch(null); setSearchOpen(false); setTab("Offered"); }} disabled={!selectedSubjects.length} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Confirm match</button></div></Dialog.Popup></Dialog.Viewport></Dialog.Portal></Dialog.Root>
    </main>
  );
}

function Carousel() {
  return <div className="absolute left-1/2 top-5 z-10 flex -translate-x-1/2 gap-2" aria-hidden="true"><span className="h-1 w-8 rounded-full bg-[#b0b0b0]" /><span className="h-1 w-8 rounded-full bg-white" /><span className="h-1 w-8 rounded-full bg-white" /></div>;
}

function TutorPhoto({ tutor }: { tutor: Tutor }) {
  const photos = ["photo-1534528741775-53994a69daeb", "photo-1506794778202-cad84cf45f1d", "photo-1524504388940-b1c1722653e1", "photo-1500648767791-00dcc994a43e"];
  const photo = photos[Math.max(0, tutors.indexOf(tutor))];
  // shortcut: sample portraits until the tutor API supplies profile photos.
  return <div role="img" aria-label={`Portrait of ${tutor.name}`} className="absolute inset-0 bg-[#d9d9d9] bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=85)` }} />;
}

