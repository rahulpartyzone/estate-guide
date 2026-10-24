import { BadgeIndianRupee, CalendarCheck, Landmark, ShieldCheck } from "lucide-react";

const POINTS = [
  { Icon: BadgeIndianRupee, title: "Zero brokerage", text: "Our help is free for home buyers. You pay the builder's price, nothing on top." },
  { Icon: ShieldCheck, title: "RERA-registered projects", text: "Every listing shows its RERA number, so you can check the project yourself." },
  { Icon: CalendarCheck, title: "Site visits arranged", text: "Pick a date and we'll set up the visit with the builder's team." },
  { Icon: Landmark, title: "Home-loan help", text: "We'll connect you with lenders and help you compare offers." },
];

/** Reasons to enquire through us rather than directly. Edit the wording above to match how you work. */
const WhyUs = () => (
  <section className="border-y bg-gradient-subtle py-16 md:py-20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Why buy with us</p>
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">Buying a home, made simpler</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {POINTS.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default WhyUs;
