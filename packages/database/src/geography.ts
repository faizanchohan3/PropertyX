/**
 * Reference geography: provinces/territories and cities of Pakistan.
 * Real place names; coordinates are approximate city centroids (good enough for
 * map centring and distance sorting, not for surveying). Production-safe — loaded
 * by `npm run db:reference` so every city can be searched and listed in, even
 * before it has localities or listings.
 */
import { sql, inArray } from "drizzle-orm";
import { slugify as slug } from "@propertyx/shared";
import type { Database } from "./client";
import { provinces, cities, locations, areas, societies } from "./schema";

type CityRow = [name: string, lat: number, lng: number];

export const PAKISTAN_CITIES: Record<string, CityRow[]> = {
  "Islamabad Capital Territory": [["Islamabad", 33.6844, 73.0479]],
  Punjab: [
    ["Lahore", 31.5204, 74.3587],
    ["Faisalabad", 31.4504, 73.135],
    ["Rawalpindi", 33.5651, 73.0169],
    ["Gujranwala", 32.1877, 74.1945],
    ["Multan", 30.1575, 71.5249],
    ["Bahawalpur", 29.3956, 71.6836],
    ["Sargodha", 32.0836, 72.6711],
    ["Sialkot", 32.4945, 74.5229],
    ["Sheikhupura", 31.7167, 73.985],
    ["Rahim Yar Khan", 28.4202, 70.2952],
    ["Jhang", 31.2681, 72.3181],
    ["Dera Ghazi Khan", 30.0459, 70.6403],
    ["Gujrat", 32.5739, 74.0789],
    ["Sahiwal", 30.6682, 73.1114],
    ["Wah Cantt", 33.7715, 72.751],
    ["Kasur", 31.1187, 74.4508],
    ["Okara", 30.8138, 73.4534],
    ["Chiniot", 31.72, 72.9789],
    ["Kamoke", 31.974, 74.224],
    ["Hafizabad", 32.0679, 73.688],
    ["Sadiqabad", 28.3062, 70.1307],
    ["Burewala", 30.1667, 72.65],
    ["Khanewal", 30.3017, 71.9321],
    ["Muzaffargarh", 30.0703, 71.1933],
    ["Mandi Bahauddin", 32.5861, 73.4917],
    ["Jhelum", 32.9425, 73.7257],
    ["Khanpur", 28.6453, 70.6567],
    ["Pakpattan", 30.3436, 73.387],
    ["Daska", 32.324, 74.35],
    ["Gojra", 31.1487, 72.6866],
    ["Muridke", 31.802, 74.255],
    ["Bahawalnagar", 29.9987, 73.2536],
    ["Samundri", 31.0639, 72.9525],
    ["Jaranwala", 31.3333, 73.4167],
    ["Chishtian", 29.7967, 72.8578],
    ["Attock", 33.766, 72.3609],
    ["Vehari", 30.0453, 72.3489],
    ["Kot Addu", 30.47, 70.9667],
    ["Wazirabad", 32.4436, 74.12],
    ["Mianwali", 32.5839, 71.537],
    ["Kamalia", 30.7272, 72.6458],
    ["Ahmedpur East", 29.1439, 71.2572],
    ["Arifwala", 30.2906, 73.0653],
    ["Khushab", 32.2967, 72.3525],
    ["Hasilpur", 29.6967, 72.5539],
    ["Bhakkar", 31.6253, 71.0656],
    ["Layyah", 30.9693, 70.9428],
    ["Taxila", 33.746, 72.835],
    ["Chakwal", 32.93, 72.855],
    ["Narowal", 32.102, 74.873],
    ["Lodhran", 29.5339, 71.6324],
    ["Toba Tek Singh", 30.9709, 72.4826],
    ["Mian Channu", 30.44, 72.355],
    ["Pattoki", 31.0214, 73.8528],
    ["Chichawatni", 30.5301, 72.6916],
    ["Kharian", 32.811, 73.865],
    ["Haroonabad", 29.61, 73.1361],
    ["Murree", 33.907, 73.3943],
    ["Rajanpur", 29.1044, 70.3301],
    ["Nankana Sahib", 31.45, 73.7065],
    ["Shakargarh", 32.2628, 75.1583],
    ["Pir Mahal", 30.7667, 72.4333],
    ["Kabirwala", 30.405, 71.865],
    ["Mailsi", 29.8, 72.1667],
    ["Jalalpur Jattan", 32.639, 74.206],
    ["Sambrial", 32.475, 74.352],
    ["Talagang", 32.928, 72.415],
    ["Fort Abbas", 29.192, 72.854],
    ["Yazman", 29.121, 71.745],
    ["Pind Dadan Khan", 32.587, 73.045],
    ["Raiwind", 31.249, 74.215],
    ["Phalia", 32.43, 73.58],
    ["Shorkot", 30.8333, 72.0833],
    ["Liaquatpur", 28.93, 70.95],
    ["Taunsa", 30.704, 70.65],
    ["Fateh Jang", 33.565, 72.64],
    ["Gujar Khan", 33.254, 73.304],
    ["Pindi Bhattian", 31.898, 73.274],
    ["Depalpur", 30.67, 73.653],
    ["Renala Khurd", 30.879, 73.598],
    ["Alipur", 29.382, 70.911],
    ["Jampur", 29.642, 70.595],
    ["Kot Radha Kishan", 31.17, 74.1],
    ["Chunian", 30.964, 73.979],
    ["Sangla Hill", 31.716, 73.383],
    ["Kot Momin", 32.188, 73.029],
    ["Bhalwal", 32.265, 72.899],
    ["Sillanwali", 31.825, 72.54],
    ["Chak Jhumra", 31.568, 73.183],
    ["Tandlianwala", 31.033, 73.133],
    ["Shujabad", 29.88, 71.295],
    ["Jahanian", 30.033, 71.82],
    ["Dunyapur", 29.803, 71.743],
    ["Khairpur Tamewali", 29.581, 72.236],
    ["Minchinabad", 30.163, 73.568],
    ["Ahmadpur Sial", 30.678, 71.743],
    ["Tulamba", 30.525, 72.24],
    ["Jauharabad", 32.29, 72.28],
    ["Kallar Kahar", 32.78, 72.7],
    ["Kotli Sattian", 33.81, 73.52],
    ["Hazro", 33.91, 72.49],
    ["Pasrur", 32.262, 74.663],
    ["Sarai Alamgir", 32.904, 73.755],
    ["Dinga", 32.64, 73.72],
    ["Lalamusa", 32.7, 73.96],
    ["Ferozewala", 31.6, 74.27],
    ["Sharaqpur", 31.46, 74.1],
    ["Basirpur", 30.58, 73.84],
    ["Haveli Lakha", 30.45, 73.7],
    ["Chowk Azam", 31.04, 71.21],
    ["Fazilpur", 29.3, 70.45],
    ["Kehror Pacca", 29.62, 71.92],
    ["Jalalpur Pirwala", 29.5, 71.22],
    ["Ali Pur Chatha", 32.26, 73.81],
    ["Nowshera Virkan", 31.96, 73.97],
  ],
  Sindh: [
    ["Karachi", 24.8607, 67.0011],
    ["Hyderabad", 25.396, 68.3578],
    ["Sukkur", 27.7052, 68.8574],
    ["Larkana", 27.557, 68.2264],
    ["Nawabshah", 26.2442, 68.41],
    ["Mirpur Khas", 25.5276, 69.0111],
    ["Jacobabad", 28.2769, 68.4514],
    ["Shikarpur", 27.9556, 68.6382],
    ["Khairpur", 27.5295, 68.7592],
    ["Dadu", 26.7319, 67.775],
    ["Thatta", 24.7461, 67.9236],
    ["Badin", 24.656, 68.837],
    ["Tando Allahyar", 25.46, 68.719],
    ["Tando Adam", 25.768, 68.662],
    ["Umerkot", 25.361, 69.736],
    ["Sanghar", 26.046, 68.948],
    ["Ghotki", 28.006, 69.316],
    ["Kandhkot", 28.243, 69.182],
    ["Kotri", 25.365, 68.308],
    ["Jamshoro", 25.43, 68.28],
    ["Matiari", 25.597, 68.446],
    ["Mithi", 24.736, 69.797],
    ["Moro", 26.663, 68.0],
    ["Mehar", 27.18, 67.82],
    ["Hala", 25.814, 68.422],
    ["Sehwan", 26.424, 67.86],
    ["Tando Muhammad Khan", 25.123, 68.535],
    ["Kashmore", 28.432, 69.583],
    ["Gambat", 27.352, 68.521],
    ["Rohri", 27.692, 68.895],
    ["Shahdadpur", 25.926, 68.622],
    ["Naushahro Feroze", 26.84, 68.12],
    ["Kamber", 27.59, 68.0],
    ["Ratodero", 27.8, 68.29],
    ["Daharki", 28.04, 69.7],
    ["Pano Aqil", 27.85, 69.11],
    ["Digri", 25.16, 69.11],
    ["Gharo", 24.74, 67.58],
    ["Keti Bandar", 24.14, 67.45],
  ],
  "Khyber Pakhtunkhwa": [
    ["Peshawar", 34.0151, 71.5249],
    ["Mardan", 34.1989, 72.0231],
    ["Abbottabad", 34.1688, 73.2215],
    ["Mingora", 34.7717, 72.36],
    ["Kohat", 33.5869, 71.4429],
    ["Dera Ismail Khan", 31.8314, 70.9019],
    ["Bannu", 32.9889, 70.6056],
    ["Swabi", 34.12, 72.47],
    ["Nowshera", 34.0153, 71.9747],
    ["Charsadda", 34.1453, 71.7308],
    ["Mansehra", 34.33, 73.2],
    ["Haripur", 33.9946, 72.934],
    ["Chitral", 35.8518, 71.7864],
    ["Timergara", 34.828, 71.841],
    ["Batkhela", 34.617, 71.97],
    ["Hangu", 33.532, 71.06],
    ["Karak", 33.116, 71.094],
    ["Lakki Marwat", 32.607, 70.911],
    ["Tank", 32.217, 70.383],
    ["Landi Kotal", 34.098, 71.145],
    ["Parachinar", 33.899, 70.101],
    ["Topi", 34.07, 72.623],
    ["Shabqadar", 34.216, 71.555],
    ["Takht-i-Bahi", 34.286, 71.946],
    ["Daggar", 34.51, 72.48],
    ["Besham", 34.93, 72.88],
    ["Battagram", 34.68, 73.023],
    ["Kalam", 35.488, 72.58],
    ["Miranshah", 33.0, 70.07],
    ["Wana", 32.3, 69.57],
    ["Khar", 34.73, 71.52],
    ["Jamrud", 34.0, 71.38],
    ["Risalpur", 34.06, 71.99],
    ["Havelian", 34.05, 73.16],
    ["Nathia Gali", 34.07, 73.38],
    ["Kulachi", 31.93, 70.46],
    ["Pabbi", 34.01, 71.8],
    ["Saidu Sharif", 34.75, 72.35],
    ["Dir", 35.2, 71.88],
  ],
  Balochistan: [
    ["Quetta", 30.1798, 66.975],
    ["Turbat", 26.0023, 63.044],
    ["Gwadar", 25.1264, 62.3225],
    ["Khuzdar", 27.8, 66.6167],
    ["Hub", 25.05, 66.8833],
    ["Chaman", 30.921, 66.46],
    ["Sibi", 29.543, 67.877],
    ["Zhob", 31.341, 69.449],
    ["Loralai", 30.37, 68.6],
    ["Dera Murad Jamali", 28.546, 68.223],
    ["Dera Allah Yar", 28.374, 68.35],
    ["Usta Muhammad", 28.179, 68.043],
    ["Kalat", 29.026, 66.59],
    ["Mastung", 29.799, 66.845],
    ["Nushki", 29.554, 66.022],
    ["Pishin", 30.58, 67.0],
    ["Panjgur", 26.964, 64.094],
    ["Kharan", 28.583, 65.416],
    ["Ormara", 25.21, 64.636],
    ["Pasni", 25.263, 63.47],
    ["Jiwani", 25.048, 61.745],
    ["Uthal", 25.807, 66.622],
    ["Ziarat", 30.381, 67.725],
    ["Dalbandin", 28.888, 64.406],
    ["Kohlu", 29.896, 69.253],
    ["Dera Bugti", 29.03, 69.158],
    ["Qila Saifullah", 30.7, 68.36],
    ["Bela", 26.23, 66.31],
  ],
  "Gilgit-Baltistan": [
    ["Gilgit", 35.9208, 74.308],
    ["Skardu", 35.2971, 75.6333],
    ["Hunza", 36.3167, 74.65],
    ["Chilas", 35.42, 74.094],
    ["Khaplu", 35.16, 76.33],
    ["Astore", 35.366, 74.857],
    ["Gahkuch", 36.175, 73.759],
    ["Shigar", 35.42, 75.73],
  ],
  "Azad Jammu and Kashmir": [
    ["Muzaffarabad", 34.37, 73.4711],
    ["Mirpur", 33.1484, 73.7518],
    ["Rawalakot", 33.8578, 73.7604],
    ["Kotli", 33.518, 73.902],
    ["Bhimber", 32.974, 74.079],
    ["Bagh", 33.98, 73.77],
    ["Pallandri", 33.715, 73.686],
    ["Hattian Bala", 34.169, 73.743],
    ["Athmuqam", 34.57, 73.9],
    ["Dadyal", 33.4, 73.85],
  ],
};

/** Larger markets shown first in city pickers (after any cities with demo data). */
const MAJOR = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad", "Gujranwala", "Sialkot", "Bahawalpur", "Sargodha", "Sukkur"];

/**
 * Idempotently adds any missing provinces and cities (plus their `locations` index rows).
 * Existing rows — including demo cities with localities — are left untouched.
 */
type LocalityRow = [name: string, kind: "area" | "society", lat: number, lng: number];

/**
 * Real housing societies and areas added on top of the demo seed, keyed by city slug.
 * Coordinates are approximate (within the city); admins can refine them in Admin → Areas.
 */
export const PAKISTAN_LOCALITIES: Record<string, LocalityRow[]> = {
  burewala: [
    ["Fine City", "society", 30.1545, 72.6385],
    ["Fine City Executive", "society", 30.1525, 72.6355],
    ["Royal Garden", "society", 30.1765, 72.6625],
    ["Liberty Living", "society", 30.1605, 72.6765],
    ["City Housing", "society", 30.1825, 72.6485],
  ],
};

export async function syncGeography(db: Database) {
  const provinceNames = Object.keys(PAKISTAN_CITIES);
  await db.insert(provinces).values(provinceNames.map((name) => ({ name, slug: slug(name) }))).onConflictDoNothing({ target: provinces.slug });
  const provRows = await db.select({ id: provinces.id, name: provinces.name, slug: provinces.slug }).from(provinces);
  const provBySlug = new Map(provRows.map((p) => [p.slug, p]));

  const cityValues = Object.entries(PAKISTAN_CITIES).flatMap(([prov, list]) =>
    list.map(([name, lat, lng]) => {
      const major = MAJOR.indexOf(name);
      return { provinceId: provBySlug.get(slug(prov))!.id, name, slug: slug(name), lat, lng, isMajor: major >= 0, sortOrder: major >= 0 ? 50 + major : 1000 };
    }),
  );
  await db.insert(cities).values(cityValues).onConflictDoNothing({ target: cities.slug });

  const provinceName = new Map(provRows.map((p) => [p.id, p.name]));
  const cityRows = await db.select({ id: cities.id, name: cities.name, slug: cities.slug, lat: cities.lat, lng: cities.lng, provinceId: cities.provinceId }).from(cities);
  const locRows = [
    ...provRows.map((p) => ({ kind: "province" as const, refId: p.id, name: p.name, fullName: p.name, slug: `province-${p.slug}` })),
    ...cityRows.map((c) => ({ kind: "city" as const, refId: c.id, cityId: c.id, name: c.name, fullName: `${c.name}, ${provinceName.get(c.provinceId)}`, slug: c.slug, lat: c.lat, lng: c.lng })),
  ];
  // conflicts on (kind, ref_id) or slug mean the row already exists
  for (let i = 0; i < locRows.length; i += 200) await db.insert(locations).values(locRows.slice(i, i + 200)).onConflictDoNothing();
  await db.execute(sql`
    update locations l set parent_id = p.id from cities c, locations p
    where l.kind = 'city' and l.parent_id is null and c.id = l.ref_id and p.kind = 'province' and p.ref_id = c.province_id`);
  await syncLocalities(db);
}

/** Inserts PAKISTAN_LOCALITIES that are missing; existing rows (matched by slug) are left untouched. */
async function syncLocalities(db: Database) {
  const citySlugs = Object.keys(PAKISTAN_LOCALITIES);
  const cityRows = await db.select({ id: cities.id, name: cities.name, slug: cities.slug }).from(cities).where(inArray(cities.slug, citySlugs));
  const cityLocs = await db.select({ id: locations.id, refId: locations.refId }).from(locations).where(inArray(locations.refId, cityRows.map((c) => c.id)));
  for (const city of cityRows) {
    const parentId = cityLocs.find((l) => l.refId === city.id)?.id ?? null;
    for (const [name, kind, lat, lng] of PAKISTAN_LOCALITIES[city.slug]) {
      const base = slug(name);
      const locSlug = base.includes(city.slug) ? base : `${base}-${city.slug}`;
      const table = kind === "area" ? areas : societies;
      await db.insert(table).values({ cityId: city.id, name, slug: locSlug, lat, lng }).onConflictDoNothing({ target: table.slug });
      const [row] = await db.select({ id: table.id }).from(table).where(sql`${table.slug} = ${locSlug}`);
      await db.insert(locations).values({ kind, refId: row.id, cityId: city.id, parentId, name, fullName: `${name}, ${city.name}`, slug: locSlug, lat, lng }).onConflictDoNothing();
    }
  }
}
