import { useId, useMemo, useRef, useState } from "react";
import { Building, Building2, MapPin, Map as MapIcon, Search } from "lucide-react";
import type { Property } from "@/types/property";

export type Suggestion =
  | { kind: "area"; value: string; city: string; count: number }
  | { kind: "city"; value: string; count: number }
  | { kind: "project"; value: string; id: string; place: string }
  | { kind: "builder"; value: string; count: number };

const MAX = 8;

/** Every area, city, project and builder among the listed projects, for suggestions. */
function buildIndex(properties: Property[]): Suggestion[] {
  const areas = new Map<string, { value: string; city: string; count: number }>();
  const cities = new Map<string, { value: string; count: number }>();
  const builders = new Map<string, { value: string; count: number }>();
  const projects: Suggestion[] = [];
  for (const p of properties) {
    if (p.area) {
      const key = `${p.area.toLowerCase()}|${(p.city || "").toLowerCase()}`;
      const a = areas.get(key) || { value: p.area, city: p.city || "", count: 0 };
      a.count += 1;
      areas.set(key, a);
    }
    if (p.city) {
      const c = cities.get(p.city.toLowerCase()) || { value: p.city, count: 0 };
      c.count += 1;
      cities.set(p.city.toLowerCase(), c);
    }
    if (p.builder) {
      const b = builders.get(p.builder.toLowerCase()) || { value: p.builder, count: 0 };
      b.count += 1;
      builders.set(p.builder.toLowerCase(), b);
    }
    if (p.name) projects.push({ kind: "project", value: p.name, id: p.id, place: [p.area, p.city].filter(Boolean).join(", ") });
  }
  return [
    ...[...cities.values()].map((c) => ({ kind: "city" as const, ...c })),
    ...[...areas.values()].map((a) => ({ kind: "area" as const, ...a })),
    ...projects,
    ...[...builders.values()].map((b) => ({ kind: "builder" as const, ...b })),
  ];
}

/** Lower is better: whole-word start beats a match in the middle; locations come before projects and builders. */
function score(s: Suggestion, q: string): number {
  const v = s.value.toLowerCase();
  const kindRank = { city: 0, area: 1, project: 2, builder: 3 }[s.kind];
  let pos: number;
  if (v.startsWith(q)) pos = 0;
  else if (v.split(/[\s,.-]+/).some((w) => w.startsWith(q))) pos = 1;
  else if (v.includes(q)) pos = 2;
  else if (s.kind === "area" && s.city.toLowerCase().startsWith(q)) pos = 3; // "pun" also lists areas in Pune
  else return -1;
  return pos * 10 + kindRank;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-foreground">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

const ICONS = { city: MapIcon, area: MapPin, project: Building, builder: Building2 };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
function detail(s: Suggestion) {
  switch (s.kind) {
    case "city":
      return `City · ${plural(s.count, "project")}`;
    case "area":
      return `Area${s.city ? ` in ${s.city}` : ""} · ${plural(s.count, "project")}`;
    case "project":
      return `Project${s.place ? ` · ${s.place}` : ""}`;
    case "builder":
      return `Builder · ${plural(s.count, "project")}`;
  }
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (s: Suggestion) => void;
  /** Enter with no suggestion highlighted */
  onSubmit?: () => void;
  properties: Property[];
  placeholder?: string;
  inputClassName?: string;
  /** Icon inside the box: a pin for the home banner, a magnifier elsewhere */
  icon?: "pin" | "search";
}

/** Search box that suggests areas, cities, projects and builders from the listed projects as you type. */
const SearchSuggest = ({ value, onChange, onSelect, onSubmit, properties, placeholder, inputClassName = "", icon = "search" }: Props) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const index = useMemo(() => buildIndex(properties), [properties]);

  const q = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q) return [];
    return index
      .map((s) => ({ s, rank: score(s, q) }))
      .filter((x) => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank || a.s.value.localeCompare(b.s.value))
      .slice(0, MAX)
      .map((x) => x.s);
  }, [index, q]);

  const show = open && suggestions.length > 0;

  const choose = (s: Suggestion) => {
    setOpen(false);
    setActive(-1);
    onSelect(s);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      if (show && active >= 0) {
        e.preventDefault();
        choose(suggestions[active]);
      } else if (onSubmit) {
        e.preventDefault();
        setOpen(false);
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const Icon = icon === "pin" ? MapPin : Search;

  return (
    <div className="relative w-full">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className={`w-full pl-10 outline-none ${inputClassName}`}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 max-h-80 w-full min-w-[min(20rem,calc(100vw-3rem))] overflow-y-auto rounded-xl border bg-popover py-1.5 text-left text-popover-foreground shadow-xl"
        >
          {suggestions.map((s, i) => {
            const ItemIcon = ICONS[s.kind];
            return (
              <li
                key={`${s.kind}-${s.value}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 ${i === active ? "bg-muted" : ""}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ItemIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground/90">
                    <Highlight text={s.value} query={value.trim()} />
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{detail(s)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SearchSuggest;
