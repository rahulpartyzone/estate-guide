import { BadgeIndianRupee, CalendarCheck, Landmark, ShieldCheck } from "lucide-react";
import SectionHeading from "@/components/public/SectionHeading";
import { useText } from "@/content/siteText";

const POINTS = [
  { Icon: BadgeIndianRupee, title: "home.why.p1Title", text: "home.why.p1Text" },
  { Icon: ShieldCheck, title: "home.why.p2Title", text: "home.why.p2Text" },
  { Icon: CalendarCheck, title: "home.why.p3Title", text: "home.why.p3Text" },
  { Icon: Landmark, title: "home.why.p4Title", text: "home.why.p4Text" },
];

/** Reasons to enquire through us. Wording: Admin -> Settings -> Site text -> Home page. */
const WhyUs = () => {
  const { t, show } = useText();
  const points = POINTS.filter((p) => show(p.title) || show(p.text));
  if (!points.length) return null;
  return (
    <section className="border-y bg-gradient-subtle py-16 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t("home.why.eyebrow")} title={t("home.why.title")} />
        <div className={`grid gap-4 sm:grid-cols-2 lg:gap-6 ${points.length >= 4 ? "lg:grid-cols-4" : points.length === 3 ? "lg:grid-cols-3" : ""}`}>
          {points.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              {show(title) && <h3 className="text-lg font-semibold text-foreground">{t(title)}</h3>}
              {show(text) && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(text)}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
