import Link from "next/link";
import Image from "next/image";
import { sql } from "drizzle-orm";
import { Home, Building, LandPlot, Store, Trees, HardHat, KeyRound, Sparkles, Calculator, TrendingUp, Landmark, Hammer, Scale, ArrowRight, ShieldCheck, BadgeCheck, LineChart } from "lucide-react";
import { createSearchEngine } from "@propertyx/search";
import { listProjects, listPosts, recommendedFor, serveAds, getSetting, listAgents } from "@propertyx/core";
import { formatPKR, PROJECT_STATUS_LABELS } from "@propertyx/shared";
import { db, getUser } from "@/lib/server";
import { HeroSearch } from "@/components/hero-search";
import { PropertyGrid } from "@/components/property-card";
import { VerificationBadge } from "@/components/badges";
import { AiPromptBox } from "@/components/ai-prompt-box";
import { savedIdsFor } from "@/lib/queries";

export const revalidate = 0;

const CATEGORIES = [
  { label: "Houses", href: "/buy/house", icon: Home },
  { label: "Flats", href: "/buy/flat", icon: Building },
  { label: "Plots", href: "/plots-for-sale", icon: LandPlot },
  { label: "Commercial", href: "/commercial-property", icon: Store },
  { label: "Farmhouses", href: "/buy/farmhouse", icon: Trees },
  { label: "New Projects", href: "/projects", icon: HardHat },
  { label: "Rentals", href: "/rent", icon: KeyRound },
];

const TOOLS = [
  { label: "AI Property Assistant", desc: "Describe what you need in plain words.", href: "/ai", icon: Sparkles },
  { label: "What's My Property Worth?", desc: "Indicative value from comparable listings.", href: "/tools/property-value", icon: LineChart },
  { label: "Investment Advisor", desc: "Yield, ROI, cash flow and a clear score.", href: "/tools/investment", icon: TrendingUp },
  { label: "Home Finance", desc: "Conventional and Islamic financing.", href: "/tools/home-loan", icon: Landmark },
  { label: "Installment Planner", desc: "Full schedule for any payment plan.", href: "/tools/installment", icon: Calculator },
  { label: "Construction Cost", desc: "Grey structure to finishing, itemised.", href: "/tools/construction-cost", icon: Hammer },
];

export default async function HomePage() {
  const user = await getUser();
  const engine = createSearchEngine(db);
  const homepage = (await getSetting<{ heroTitle: string; heroSubtitle: string; featuredCities: string[]; sections: Record<string, boolean>; announcement: string }>(db, "homepage"))!;
  const [featured, rentals, projects, posts, rec, banner, cityCounts, agents] = await Promise.all([
    engine.search({ sort: "recommended", pageSize: 8, purpose: "sale" }),
    engine.search({ sort: "newest", pageSize: 4, purpose: "rent" }),
    listProjects(db),
    listPosts(db, {}),
    user ? recommendedFor(db, user.id, 4) : Promise.resolve(null),
    serveAds(db, "homepage_banner"),
    db.execute<{ slug: string; name: string; n: number }>(sql`
      select c.slug, c.name, count(l.id)::int as n from cities c
      left join properties p on p.city_id = c.id left join property_listings l on l.property_id = p.id and l.status = 'active'
      group by c.slug, c.name, c.sort_order having count(l.id) > 0 order by c.sort_order, c.name`),
    listAgents(db, { verified: true }),
  ]);
  const saved = user ? await savedIdsFor(user.id) : [];
  const ad = banner[0];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-brand-950">
        <Image src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=70" alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/60 via-brand-950/40 to-brand-950/90" />
        <div className="container-px pb-14 pt-12 sm:pb-20 sm:pt-20">
          {homepage.announcement && <p className="mb-4 inline-block rounded-full bg-gold-500/20 px-4 py-1 text-sm text-gold-100 ring-1 ring-gold-400/40">{homepage.announcement}</p>}
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] text-white sm:text-6xl">{homepage.heroTitle}</h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-50/90">{homepage.heroSubtitle}</p>
          <div className="mt-8 max-w-5xl">
            <HeroSearch />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {CATEGORIES.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20">
                <Icon className="h-4 w-4 text-gold-300" /> {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container-px grid gap-4 py-5 text-sm text-slate-600 sm:grid-cols-3">
          <p className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-600" /> Five-level verification on listings and agents</p>
          <p className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold-500" /> AI search that explains why each property matches</p>
          <p className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-brand-600" /> Fraud checks on prices, photos and phone numbers</p>
        </div>
      </section>

      {/* FEATURED */}
      {homepage.sections.featured !== false && (
        <section className="container-px mt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Featured properties</h2>
              <p className="mt-1 text-slate-500">Hand-picked and promoted listings across Pakistan</p>
            </div>
            <Link href="/search?purpose=sale" className="hidden items-center gap-1 text-sm font-semibold text-brand-700 sm:flex">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <PropertyGrid items={featured.items} savedIds={saved} />
        </section>
      )}

      {/* AI */}
      <section className="container-px mt-16">
        <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-900 to-night p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <span className="badge bg-gold-500/20 text-gold-200 ring-1 ring-gold-400/40">
              <Sparkles className="h-3.5 w-3.5" /> AI Property Assistant
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-white">Tell us what you need. We'll find it and explain why.</h2>
            <p className="mt-3 text-brand-100/80">Searches live listings only — it never invents properties or prices. Refine in plain words: “show cheaper options”, “only corner houses”, “with possession”.</p>
          </div>
          <AiPromptBox />
        </div>
      </section>

      {/* RECOMMENDED */}
      {rec && rec.items.length > 0 && homepage.sections.recommended !== false && (
        <section className="container-px mt-16">
          <h2 className="section-title">Recommended for you</h2>
          <p className="mb-6 mt-1 text-slate-500">Based on what you've viewed and saved{rec.basis !== "popular" ? ` — ${rec.basis}` : ""}</p>
          <PropertyGrid items={rec.items} savedIds={saved} />
        </section>
      )}

      {/* AD BANNER */}
      {ad && (
        <section className="container-px mt-16">
          <a href={`/api/v1/ads/${ad.id}/click`} rel="sponsored" className="group relative flex min-h-[180px] items-center overflow-hidden rounded-3xl bg-slate-900 p-8 text-white">
            {ad.imageUrl && <Image src={ad.imageUrl} alt="" fill sizes="100vw" className="object-cover opacity-40 transition group-hover:scale-105" />}
            <div className="relative">
              <span className="badge bg-white/20 text-white">Sponsored</span>
              <p className="mt-2 text-2xl font-bold">{ad.title}</p>
              {ad.body && <p className="mt-1 text-slate-200">{ad.body}</p>}
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-300">
                Learn more <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </a>
        </section>
      )}

      {/* CITIES */}
      {homepage.sections.cities !== false && (
        <section className="container-px mt-16">
          <h2 className="section-title">Explore by city</h2>
          <p className="mb-6 mt-1 text-slate-500">Live listing counts from PropertyX</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cityCounts
              .filter((c) => homepage.featuredCities.includes(c.slug))
              .map((c) => (
                <Link key={c.slug} href={`/area/${c.slug}`} className="card group flex items-center justify-between p-4 hover:border-brand-300">
                  <span>
                    <span className="block font-bold text-slate-900 group-hover:text-brand-700">{c.name}</span>
                    <span className="text-sm text-slate-500">{c.n.toLocaleString()} properties</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* PROJECTS */}
      {homepage.sections.projects !== false && projects.length > 0 && (
        <section className="container-px mt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="section-title">New projects</h2>
              <p className="mt-1 text-slate-500">Apartments, villas and plots with payment plans</p>
            </div>
            <Link href="/projects" className="flex items-center gap-1 text-sm font-semibold text-brand-700">
              All projects <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <Link key={p.id} href={`/project/${p.slug}`} className="card group overflow-hidden">
                <div className="relative aspect-[16/10] bg-slate-100">
                  {p.cover && <Image src={p.cover} alt={p.name} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                  <span className="badge absolute left-3 top-3 bg-white/95 text-slate-800">{PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS]}</span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{p.developerName}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 group-hover:text-brand-700">{p.name}</p>
                  <p className="text-sm text-slate-500">{[p.locationName, p.cityName].filter(Boolean).join(", ")}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                    <span className="text-slate-500">From</span>
                    <span className="font-bold text-slate-900">{p.minPrice ? formatPKR(p.minPrice) : "On request"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* RENTALS */}
      <section className="container-px mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="section-title">Latest rentals</h2>
            <p className="mt-1 text-slate-500">Freshly listed homes for rent</p>
          </div>
          <Link href="/rent" className="flex items-center gap-1 text-sm font-semibold text-brand-700">
            All rentals <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PropertyGrid items={rentals.items} savedIds={saved} />
      </section>

      {/* TOOLS */}
      {homepage.sections.tools !== false && (
        <section className="container-px mt-16">
          <h2 className="section-title">Smarter decisions</h2>
          <p className="mb-6 mt-1 text-slate-500">Free calculators built for Pakistani property</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map(({ label, desc, href, icon: Icon }) => (
              <Link key={href} href={href} className="card group flex items-start gap-4 p-5 hover:border-brand-300">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-slate-900">{label}</span>
                  <span className="text-sm text-slate-500">{desc}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link href="/compare" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
            <Scale className="h-4 w-4" /> Compare up to 4 properties side by side
          </Link>
        </section>
      )}

      {/* AGENTS */}
      {homepage.sections.agents !== false && agents.items.length > 0 && (
        <section className="container-px mt-16">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="section-title">Verified agents</h2>
              <p className="mt-1 text-slate-500">Identity-checked professionals</p>
            </div>
            <Link href="/agents" className="flex items-center gap-1 text-sm font-semibold text-brand-700">
              Find an agent <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {agents.items.slice(0, 4).map((a) => (
              <Link key={a.id} href={`/agents/${a.slug}`} className="card p-5 text-center hover:border-brand-300">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-800">{a.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                <p className="mt-3 font-semibold text-slate-900">{a.name}</p>
                <p className="truncate text-xs text-slate-500">{a.agencyName}</p>
                <div className="mt-2 flex justify-center">
                  <VerificationBadge level={a.verificationLevel} kind="agent" />
                </div>
                <p className="mt-2 text-xs text-slate-500">{a.activeListings} active listings</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* GUIDES */}
      {homepage.sections.guides !== false && (
        <section className="container-px mt-16">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="section-title">Guides & insights</h2>
            <Link href="/blog" className="flex items-center gap-1 text-sm font-semibold text-brand-700">
              All guides <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {posts.items.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="card group overflow-hidden">
                <div className="relative aspect-[16/9] bg-slate-100">{p.coverImage && <Image src={p.coverImage} alt="" fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />}</div>
                <div className="p-5">
                  <p className="font-bold text-slate-900 group-hover:text-brand-700">{p.title}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{p.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
