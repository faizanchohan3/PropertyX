import { sql } from "drizzle-orm";
import type { Database } from "@propertyx/database";
import { requirePerm, type Actor } from "./errors";
import { myAgency, myDeveloper } from "./directory";

type Row = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);

const FUNNEL = ["view", "save", "call_click", "whatsapp_click", "phone_reveal", "message", "lead", "visit_request", "share"] as const;

function funnel(rows: Row[]) {
  const out: Record<string, number> = Object.fromEntries(FUNNEL.map((k) => [k, 0]));
  for (const r of rows) out[r.type as string] = n(r.c);
  return out;
}

/** Engagement analytics for a set of listings (by poster or agency). */
export async function listingAnalytics(db: Database, actor: Actor, opts: { days?: number; listingId?: string; scope?: "mine" | "agency" } = {}) {
  const days = opts.days ?? 30;
  let owner = sql`l.posted_by_id = ${actor.id}`;
  if (opts.scope === "agency") {
    const mine = await myAgency(db, actor);
    if (mine && ["admin", "manager", "marketing"].includes(mine.role)) owner = sql`l.agency_id = ${mine.agency.id}`;
  }
  const target = opts.listingId ? sql`and l.id = ${opts.listingId}` : sql``;
  const totals = await db.execute<Row>(sql`select e.type, count(*)::int as c from listing_events e join property_listings l on l.id = e.listing_id where ${owner} ${target} and e.created_at > now() - make_interval(days => ${days}) group by e.type`);
  const daily = await db.execute<Row>(sql`
    select to_char(d, 'YYYY-MM-DD') as day,
      count(e.id) filter (where e.type = 'view')::int as views,
      count(e.id) filter (where e.type in ('lead','message','visit_request','call_click','whatsapp_click'))::int as enquiries,
      count(e.id) filter (where e.type = 'save')::int as saves
    from generate_series((now() - make_interval(days => ${days - 1}))::date, now()::date, interval '1 day') d
    left join (select e.* from listing_events e join property_listings l on l.id = e.listing_id where ${owner} ${target}) e on e.created_at::date = d::date
    group by d order by d`);
  const top = await db.execute<Row>(sql`
    select l.id, l.title, l.slug, l.status, l.views_count, l.saves_count, l.leads_count,
      (select count(*)::int from listing_events e where e.listing_id = l.id and e.type = 'view' and e.created_at > now() - make_interval(days => ${days})) as views_period,
      (select count(*)::int from listing_events e where e.listing_id = l.id and e.type in ('lead','message','visit_request','call_click','whatsapp_click') and e.created_at > now() - make_interval(days => ${days})) as enquiries_period
    from property_listings l where ${owner} ${target} order by views_period desc, l.views_count desc limit 10`);
  const [leadStats] = await db.execute<Row>(sql`
    select count(*)::int as total, count(*) filter (where ld.status = 'won')::int as won, count(*) filter (where ld.status = 'new')::int as new,
      avg(extract(epoch from (ld.last_contacted_at - ld.created_at)) / 60) filter (where ld.last_contacted_at is not null) as response_mins
    from leads ld join property_listings l on l.id = ld.listing_id where ${owner} ${target} and ld.created_at > now() - make_interval(days => ${days})`);
  const f = funnel(totals);
  const enquiries = f.lead + f.message + f.visit_request + f.call_click + f.whatsapp_click;
  return {
    days,
    funnel: f,
    enquiries,
    conversionRate: f.view ? Math.round((enquiries / f.view) * 1000) / 10 : 0,
    daily: daily.map((d) => ({ day: d.day as string, views: n(d.views), enquiries: n(d.enquiries), saves: n(d.saves) })),
    top: top.map((t) => ({ id: t.id as string, title: t.title as string, slug: t.slug as string, status: t.status as string, views: n(t.views_period), enquiries: n(t.enquiries_period), totalViews: n(t.views_count), saves: n(t.saves_count), leads: n(t.leads_count) })),
    leads: { total: n(leadStats?.total), won: n(leadStats?.won), new: n(leadStats?.new), avgResponseMins: leadStats?.response_mins != null ? Math.round(Number(leadStats.response_mins)) : null, conversionPct: n(leadStats?.total) ? Math.round((n(leadStats?.won) / n(leadStats?.total)) * 1000) / 10 : 0 },
  };
}

export async function agencyAnalytics(db: Database, actor: Actor, days = 30) {
  const mine = await myAgency(db, actor);
  if (!mine) return null;
  const perAgent = await db.execute<Row>(sql`
    select u.id, u.name,
      (select count(*)::int from property_listings l where l.posted_by_id = u.id and l.status = 'active') as listings,
      (select count(*)::int from listing_events e join property_listings l on l.id = e.listing_id where l.posted_by_id = u.id and e.type = 'view' and e.created_at > now() - make_interval(days => ${days})) as views,
      (select count(*)::int from leads ld where ld.recipient_id = u.id and ld.created_at > now() - make_interval(days => ${days})) as leads,
      (select count(*)::int from leads ld where ld.recipient_id = u.id and ld.status = 'won') as won,
      (select coalesce(sum(ld.deal_value),0) from leads ld where ld.recipient_id = u.id and ld.status = 'won') as deal_value
    from agency_members m join users u on u.id = m.user_id where m.agency_id = ${mine.agency.id} order by leads desc`);
  const overall = await listingAnalytics(db, actor, { days, scope: "agency" });
  return { agency: mine.agency, perAgent: perAgent.map((r) => ({ id: r.id as string, name: r.name as string, listings: n(r.listings), views: n(r.views), leads: n(r.leads), won: n(r.won), conversion: n(r.leads) ? Math.round((n(r.won) / n(r.leads)) * 100) : 0, dealValue: n(r.deal_value) })), overall };
}

export async function developerAnalytics(db: Database, actor: Actor, days = 30) {
  const dev = await myDeveloper(db, actor);
  if (!dev) return null;
  const projects = await db.execute<Row>(sql`
    select p.id, p.name, p.slug, p.views_count, p.available_units, p.total_units,
      (select count(*)::int from listing_events e where e.project_id = p.id and e.type = 'view' and e.created_at > now() - make_interval(days => ${days})) as views,
      (select count(*)::int from leads ld where ld.project_id = p.id and ld.created_at > now() - make_interval(days => ${days})) as leads,
      (select count(*)::int from leads ld where ld.project_id = p.id and ld.source = 'payment_plan') as plan_requests,
      (select count(*)::int from leads ld where ld.project_id = p.id and ld.source = 'brochure') as brochures,
      (select count(*)::int from payments pay where pay.reference_id = p.id::text and pay.purpose in ('project_booking','booking_fee') and pay.status = 'succeeded') as bookings
    from projects p where p.developer_id = ${dev.id} order by views desc`);
  const unitInterest = await db.execute<Row>(sql`
    select u.name, u.type, u.available_units, u.total_units, p.name as project
    from project_units u join projects p on p.id = u.project_id where p.developer_id = ${dev.id} order by (u.total_units - u.available_units)::float / greatest(u.total_units,1) desc limit 12`);
  const daily = await db.execute<Row>(sql`
    select to_char(d, 'YYYY-MM-DD') as day, count(e.id)::int as views
    from generate_series((now() - make_interval(days => ${days - 1}))::date, now()::date, interval '1 day') d
    left join listing_events e on e.created_at::date = d::date and e.type = 'view' and e.project_id in (select id from projects where developer_id = ${dev.id})
    group by d order by d`);
  return {
    developer: dev,
    projects: projects.map((p) => ({ id: p.id as string, name: p.name as string, slug: p.slug as string, views: n(p.views), totalViews: n(p.views_count), leads: n(p.leads), planRequests: n(p.plan_requests), brochures: n(p.brochures), bookings: n(p.bookings), sold: n(p.total_units) - n(p.available_units), totalUnits: n(p.total_units) })),
    unitInterest: unitInterest.map((u) => ({ name: u.name as string, type: u.type as string, project: u.project as string, sold: n(u.total_units) - n(u.available_units), total: n(u.total_units) })),
    daily: daily.map((d) => ({ day: d.day as string, views: n(d.views) })),
  };
}

export async function platformOverview(db: Database, actor: Actor | null) {
  requirePerm(actor, "admin.access");
  const [c] = await db.execute<Row>(sql`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where created_at > now() - interval '30 days') as users_30d,
      (select count(*)::int from property_listings where status = 'active') as active_listings,
      (select count(*)::int from property_listings where status = 'pending_review') as pending_listings,
      (select count(*)::int from agents) as agents,
      (select count(*)::int from agencies) as agencies,
      (select count(*)::int from developers) as developers,
      (select count(*)::int from projects) as projects,
      (select count(*)::int from projects where publish_status = 'pending') as pending_projects,
      (select count(*)::int from leads where created_at > now() - interval '30 days') as leads_30d,
      (select count(*)::int from reports where status = 'open') as open_reports,
      (select count(*)::int from fraud_flags where status = 'open') as open_fraud,
      (select count(*)::int from fraud_flags where status = 'open' and severity in ('high','critical')) as high_fraud,
      (select count(*)::int from verification_requests where status = 'pending') as pending_verifications,
      (select count(*)::int from reviews where status = 'pending') as pending_reviews,
      (select count(*)::int from advertisements where status = 'pending') as pending_ads,
      (select count(*)::int from subscriptions where status = 'active' and current_period_end > now()) as active_subscriptions,
      (select coalesce(sum(amount),0) from payments where status = 'succeeded' and paid_at > now() - interval '30 days') as revenue_30d,
      (select coalesce(sum(amount),0) from payments where status = 'succeeded') as revenue_total`);
  const revenue = await db.execute<Row>(sql`
    select to_char(date_trunc('month', paid_at), 'YYYY-MM') as month, purpose, sum(amount)::bigint as amount
    from payments where status = 'succeeded' and paid_at > now() - interval '12 months' group by 1, 2 order by 1`);
  const growth = await db.execute<Row>(sql`
    select to_char(d, 'YYYY-MM-DD') as day,
      (select count(*)::int from users u where u.created_at::date = d::date) as signups,
      (select count(*)::int from property_listings l where l.created_at::date = d::date) as listings,
      (select count(*)::int from leads ld where ld.created_at::date = d::date) as leads
    from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') d order by d`);
  const byCity = await db.execute<Row>(sql`select c.name, count(*)::int as n from property_listings l join properties p on p.id = l.property_id join cities c on c.id = p.city_id where l.status = 'active' group by c.name order by n desc`);
  return {
    counts: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, n(v)])) as Record<string, number>,
    revenue: revenue.map((r) => ({ month: r.month as string, purpose: r.purpose as string, amount: n(r.amount) })),
    growth: growth.map((g) => ({ day: g.day as string, signups: n(g.signups), listings: n(g.listings), leads: n(g.leads) })),
    byCity: byCity.map((b) => ({ name: b.name as string, count: n(b.n) })),
  };
}
