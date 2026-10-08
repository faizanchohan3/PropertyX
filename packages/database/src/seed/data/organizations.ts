/**
 * Fictional agencies, developers and projects for DEMO data. Names are invented
 * and are not intended to represent real businesses.
 */

export const AGENCIES: { name: string; city: string; year: number; description: string }[] = [
  { name: "Crescent Estate Advisors", city: "Lahore", year: 2009, description: "Residential sales and rentals across DHA and Gulberg, with a focus on documented, verified transactions." },
  { name: "Ravi Homes & Estates", city: "Lahore", year: 2014, description: "Family homes and plots in Johar Town, Wapda Town and Bahria Town Lahore." },
  { name: "Canal View Realty", city: "Lahore", year: 2017, description: "Plots and new-build homes in southern Lahore societies, specialising in installment deals." },
  { name: "Margalla Ridge Realty", city: "Islamabad", year: 2011, description: "Sector homes and apartments across F and E sectors of Islamabad." },
  { name: "Capital Keys Property Partners", city: "Islamabad", year: 2016, description: "DHA Islamabad and B-17 specialists for end-users and overseas Pakistanis." },
  { name: "Sea Breeze Realtors", city: "Karachi", year: 2008, description: "Bungalows and apartments in DHA Karachi and Clifton." },
  { name: "Harbour Line Estates", city: "Karachi", year: 2015, description: "Apartments and villas in Gulshan-e-Iqbal, Jauhar and Bahria Town Karachi." },
  { name: "Indus Commercial Brokers", city: "Karachi", year: 2012, description: "Office floors, shops and industrial units in Karachi's commercial districts." },
  { name: "Twin City Property Hub", city: "Rawalpindi", year: 2013, description: "Bahria Town and DHA Rawalpindi homes, plots and rentals." },
  { name: "Pindi Gate Estates", city: "Rawalpindi", year: 2018, description: "Residential and commercial property in central Rawalpindi." },
  { name: "Five Rivers Property Consultants", city: "Multan", year: 2015, description: "DHA Multan and Bosan Road specialists." },
  { name: "Lyallpur Land Advisors", city: "Faisalabad", year: 2012, description: "Homes, plots and commercial units across Faisalabad." },
  { name: "Chenab Property Point", city: "Gujranwala", year: 2016, description: "Gated community homes and plots in Gujranwala." },
  { name: "Khyber Gate Estates", city: "Peshawar", year: 2010, description: "Hayatabad and University Town homes and rentals." },
];

export const FIRST_NAMES_M = ["Ahmed", "Ali", "Usman", "Hamza", "Bilal", "Faisal", "Imran", "Kamran", "Zeeshan", "Saad", "Haris", "Omer", "Asad", "Fahad", "Waqas", "Junaid", "Adeel", "Shahzad", "Tariq", "Naveed", "Rizwan", "Danish", "Arslan", "Salman", "Yasir"];
export const FIRST_NAMES_F = ["Ayesha", "Fatima", "Sana", "Hira", "Mahnoor", "Zainab", "Amna", "Maryam", "Sadia", "Nida", "Rabia", "Saima"];
export const LAST_NAMES = ["Khan", "Malik", "Qureshi", "Butt", "Sheikh", "Chaudhry", "Awan", "Mirza", "Siddiqui", "Hashmi", "Raza", "Abbasi", "Gillani", "Bhatti", "Rana", "Javed", "Baig", "Yousafzai", "Durrani", "Memon", "Ansari", "Akhtar"];

export const SPECIALIZATIONS = ["Residential Sales", "Rentals", "Plots & Files", "Commercial", "Overseas Clients", "New Projects", "Luxury Homes", "Farmhouses", "Installment Deals", "Property Management"];

export interface ProjectSeed {
  name: string;
  developer: string;
  city: string;
  location: string;
  status: "pre_launch" | "under_construction" | "near_completion" | "ready";
  progress: number;
  launch: string;
  completion: string;
  tagline: string;
  description: string;
  amenities: string[];
  image: "apartmentBuilding" | "villa" | "aerial" | "tower" | "houseExterior" | "farmhouse" | "construction";
  units: { type: "apartment" | "villa" | "plot" | "shop" | "office" | "penthouse"; name: string; sqft: number; beds?: number; baths?: number; price: number; total: number; available: number }[];
  plans: { name: string; down: number; months: number; frequency: "monthly" | "quarterly"; possession: number; balloon?: number; notes?: string }[];
  featured?: boolean;
}

export const DEVELOPERS: { name: string; city: string; year: number; description: string }[] = [
  { name: "Emerald Crest Developers", city: "Lahore", year: 2006, description: "Mid-rise residential and mixed-use developments in central and southern Lahore." },
  { name: "Skyline Habitat Builders", city: "Islamabad", year: 2010, description: "Apartment and serviced-residence projects in Islamabad and Rawalpindi." },
  { name: "Saffron Heights Developments", city: "Karachi", year: 2004, description: "Apartment towers and gated villa communities in Karachi." },
  { name: "Northgate Builders", city: "Rawalpindi", year: 2013, description: "Affordable housing and commercial centres in the twin cities." },
  { name: "Greenline Estates", city: "Multan", year: 2015, description: "Plotted communities and villas in southern Punjab." },
  { name: "Orchard Valley Developers", city: "Faisalabad", year: 2012, description: "Gated communities and commercial projects in Faisalabad and Gujranwala." },
  { name: "Frontier Crest Builders", city: "Peshawar", year: 2016, description: "Apartments and commercial plazas in Peshawar." },
];

const STD_AMENITIES = ["24/7 Security", "CCTV Surveillance", "Backup Power", "Underground Parking", "Elevators", "Mosque", "Gym", "Community Hall"];

export const PROJECTS: ProjectSeed[] = [
  {
    name: "Aurelia Residences",
    developer: "Emerald Crest Developers",
    city: "Lahore",
    location: "Gulberg",
    status: "under_construction",
    progress: 55,
    launch: "2024-03-01",
    completion: "2027-06-30",
    tagline: "Serviced apartments off Main Boulevard Gulberg",
    description: "A 22-storey residential tower with one, two and three bedroom apartments and a small collection of duplex penthouses. Residents get a rooftop pool, fitness centre, concierge and two levels of basement parking. Units are offered on a 3-year installment plan with possession on completion.",
    amenities: [...STD_AMENITIES, "Rooftop Pool", "Concierge", "Kids Play Area"],
    image: "apartmentBuilding",
    featured: true,
    units: [
      { type: "apartment", name: "1 Bed Apartment", sqft: 780, beds: 1, baths: 1, price: 22_000_000, total: 60, available: 21 },
      { type: "apartment", name: "2 Bed Apartment", sqft: 1_250, beds: 2, baths: 2, price: 34_000_000, total: 80, available: 32 },
      { type: "apartment", name: "3 Bed Apartment", sqft: 1_850, beds: 3, baths: 3, price: 50_000_000, total: 40, available: 15 },
      { type: "penthouse", name: "Duplex Penthouse", sqft: 3_600, beds: 4, baths: 5, price: 115_000_000, total: 4, available: 2 },
    ],
    plans: [
      { name: "3-Year Easy Plan", down: 20, months: 36, frequency: "monthly", possession: 10 },
      { name: "Quarterly Plan", down: 25, months: 36, frequency: "quarterly", possession: 15 },
    ],
  },
  {
    name: "Cedar Park Villas",
    developer: "Emerald Crest Developers",
    city: "Lahore",
    location: "Bahria Town Lahore",
    status: "near_completion",
    progress: 85,
    launch: "2023-01-15",
    completion: "2026-12-31",
    tagline: "Gated 5 and 10 marla villas",
    description: "A gated cluster of 5 and 10 marla double-storey villas with a central park, clubhouse and dedicated maintenance. Grey structure is complete on most units and finishing is under way.",
    amenities: ["Gated Entry", "Central Park", "Clubhouse", "Jogging Track", "Mosque", "Maintenance Office"],
    image: "villa",
    units: [
      { type: "villa", name: "5 Marla Villa", sqft: 1_125, beds: 3, baths: 3, price: 17_500_000, total: 120, available: 18 },
      { type: "villa", name: "10 Marla Villa", sqft: 2_250, beds: 5, baths: 5, price: 31_000_000, total: 80, available: 11 },
    ],
    plans: [{ name: "2-Year Plan", down: 30, months: 24, frequency: "monthly", possession: 20 }],
  },
  {
    name: "Linden Square",
    developer: "Emerald Crest Developers",
    city: "Lahore",
    location: "DHA Lahore",
    status: "pre_launch",
    progress: 5,
    launch: "2026-09-01",
    completion: "2030-03-31",
    tagline: "Retail and office podium in DHA",
    description: "A mixed-use commercial building with ground and mezzanine retail, two food-court levels and six floors of corporate offices. Pre-launch bookings are open with a 4-year plan.",
    amenities: ["Food Court", "Escalators", "Central Air Conditioning", "Backup Power", "Basement Parking", "Fire Safety System"],
    image: "tower",
    units: [
      { type: "shop", name: "Ground Floor Shop", sqft: 320, price: 28_000_000, total: 40, available: 34 },
      { type: "shop", name: "Food Court Kiosk", sqft: 180, price: 11_000_000, total: 30, available: 27 },
      { type: "office", name: "Corporate Office", sqft: 900, price: 30_000_000, total: 60, available: 55 },
    ],
    plans: [{ name: "4-Year Plan", down: 15, months: 48, frequency: "quarterly", possession: 10, balloon: 5 }],
  },
  {
    name: "Zenith One",
    developer: "Skyline Habitat Builders",
    city: "Islamabad",
    location: "E-11",
    status: "under_construction",
    progress: 40,
    launch: "2024-08-01",
    completion: "2028-01-31",
    tagline: "Margalla-facing apartments in E-11",
    description: "Two residential towers with studio, one and two bedroom apartments facing the Margalla Hills, with a landscaped podium, gym and retail at the base.",
    amenities: [...STD_AMENITIES, "Landscaped Podium", "Retail Podium"],
    image: "apartmentBuilding",
    featured: true,
    units: [
      { type: "apartment", name: "Studio", sqft: 480, beds: 0, baths: 1, price: 9_500_000, total: 70, available: 30 },
      { type: "apartment", name: "1 Bed Apartment", sqft: 720, beds: 1, baths: 1, price: 14_000_000, total: 90, available: 38 },
      { type: "apartment", name: "2 Bed Apartment", sqft: 1_150, beds: 2, baths: 2, price: 21_500_000, total: 70, available: 29 },
    ],
    plans: [
      { name: "3.5-Year Plan", down: 20, months: 42, frequency: "monthly", possession: 10 },
      { name: "Half-Yearly Balloon Plan", down: 25, months: 42, frequency: "monthly", possession: 10, balloon: 10, notes: "Includes balloon payments due on possession." },
    ],
  },
  {
    name: "Pinecrest Enclave",
    developer: "Skyline Habitat Builders",
    city: "Islamabad",
    location: "B-17 Multi Gardens",
    status: "ready",
    progress: 100,
    launch: "2021-05-01",
    completion: "2025-04-30",
    tagline: "Ready-to-move family homes",
    description: "A completed cluster of 5, 7 and 10 marla homes with a community park and mosque. Remaining inventory is available for immediate possession.",
    amenities: ["Gated Entry", "Park", "Mosque", "Underground Electricity", "Water Filtration Plant"],
    image: "houseExterior",
    units: [
      { type: "villa", name: "5 Marla Home", sqft: 1_125, beds: 3, baths: 3, price: 16_000_000, total: 60, available: 6 },
      { type: "villa", name: "7 Marla Home", sqft: 1_575, beds: 4, baths: 4, price: 22_000_000, total: 40, available: 4 },
      { type: "villa", name: "10 Marla Home", sqft: 2_250, beds: 5, baths: 5, price: 29_500_000, total: 30, available: 3 },
    ],
    plans: [{ name: "Full Payment", down: 100, months: 1, frequency: "monthly", possession: 0, notes: "Cash purchase with immediate possession." }],
  },
  {
    name: "Harbourfront Heights",
    developer: "Saffron Heights Developments",
    city: "Karachi",
    location: "Clifton",
    status: "under_construction",
    progress: 62,
    launch: "2023-11-01",
    completion: "2027-09-30",
    tagline: "Sea-facing apartments in Clifton",
    description: "A 30-storey residential tower with two, three and four bedroom sea-facing apartments, an infinity pool deck, a residents' lounge and three basement levels of parking.",
    amenities: [...STD_AMENITIES, "Infinity Pool", "Residents' Lounge", "Sea View"],
    image: "tower",
    featured: true,
    units: [
      { type: "apartment", name: "2 Bed Sea View", sqft: 1_450, beds: 2, baths: 2, price: 42_000_000, total: 60, available: 17 },
      { type: "apartment", name: "3 Bed Sea View", sqft: 2_100, beds: 3, baths: 3, price: 61_000_000, total: 60, available: 21 },
      { type: "apartment", name: "4 Bed Sea View", sqft: 3_000, beds: 4, baths: 4, price: 92_000_000, total: 30, available: 12 },
    ],
    plans: [{ name: "4-Year Plan", down: 25, months: 48, frequency: "monthly", possession: 15 }],
  },
  {
    name: "Palm Vista Villas",
    developer: "Saffron Heights Developments",
    city: "Karachi",
    location: "Bahria Town Karachi",
    status: "near_completion",
    progress: 80,
    launch: "2022-10-01",
    completion: "2026-12-31",
    tagline: "125 and 250 sq yd villas",
    description: "Single and double-storey villas in a gated precinct with a community centre, children's park and a commercial strip.",
    amenities: ["Gated Precinct", "Community Centre", "Children's Park", "Commercial Strip", "Mosque"],
    image: "villa",
    units: [
      { type: "villa", name: "125 Sq Yd Villa", sqft: 1_125, beds: 3, baths: 3, price: 14_500_000, total: 200, available: 40 },
      { type: "villa", name: "250 Sq Yd Villa", sqft: 2_250, beds: 4, baths: 5, price: 27_000_000, total: 100, available: 22 },
    ],
    plans: [{ name: "3-Year Plan", down: 20, months: 36, frequency: "monthly", possession: 15 }],
  },
  {
    name: "Meridian Business Centre",
    developer: "Northgate Builders",
    city: "Rawalpindi",
    location: "Bahria Town Rawalpindi",
    status: "under_construction",
    progress: 35,
    launch: "2025-02-01",
    completion: "2028-06-30",
    tagline: "Offices and shops on GT Road",
    description: "A commercial centre with retail on the lower three floors and serviced office space above, with a shared conference facility and dedicated parking.",
    amenities: ["Conference Facility", "Central Air Conditioning", "Escalators", "Backup Power", "Parking", "Fire Safety System"],
    image: "construction",
    units: [
      { type: "shop", name: "Shop", sqft: 260, price: 12_500_000, total: 80, available: 52 },
      { type: "office", name: "Office", sqft: 650, price: 15_500_000, total: 90, available: 70 },
    ],
    plans: [{ name: "3-Year Plan", down: 20, months: 36, frequency: "quarterly", possession: 15 }],
  },
  {
    name: "Riverside Courtyard Homes",
    developer: "Northgate Builders",
    city: "Rawalpindi",
    location: "Gulraiz Housing Scheme",
    status: "under_construction",
    progress: 48,
    launch: "2024-06-01",
    completion: "2027-03-31",
    tagline: "Affordable townhouses",
    description: "Compact three-bedroom townhouses arranged around shared courtyards, priced for first-time buyers with a long installment plan.",
    amenities: ["Shared Courtyards", "Mosque", "Park", "Gated Entry"],
    image: "houseExterior",
    units: [{ type: "villa", name: "3 Bed Townhouse", sqft: 1_100, beds: 3, baths: 2, price: 11_500_000, total: 140, available: 64 }],
    plans: [{ name: "5-Year Plan", down: 10, months: 60, frequency: "monthly", possession: 10 }],
  },
  {
    name: "Greenline Gardens",
    developer: "Greenline Estates",
    city: "Multan",
    location: "Bosan Road",
    status: "under_construction",
    progress: 30,
    launch: "2025-01-15",
    completion: "2028-12-31",
    tagline: "Plotted community with installments",
    description: "A plotted residential community with 5, 8 and 10 marla residential plots and a commercial boulevard, offered on a four-year installment plan. Development work on roads and utilities is in progress.",
    amenities: ["Wide Roads", "Underground Utilities", "Parks", "Commercial Boulevard", "Mosque", "School Site"],
    image: "aerial",
    units: [
      { type: "plot", name: "5 Marla Plot", sqft: 1_125, price: 3_200_000, total: 400, available: 210 },
      { type: "plot", name: "8 Marla Plot", sqft: 1_800, price: 5_000_000, total: 250, available: 140 },
      { type: "plot", name: "10 Marla Plot", sqft: 2_250, price: 6_200_000, total: 200, available: 98 },
      { type: "shop", name: "Commercial Plot (4 Marla)", sqft: 900, price: 9_000_000, total: 60, available: 41 },
    ],
    plans: [{ name: "4-Year Plan", down: 15, months: 48, frequency: "monthly", possession: 10, balloon: 5 }],
  },
  {
    name: "Orchard Valley Phase 2",
    developer: "Orchard Valley Developers",
    city: "Faisalabad",
    location: "Canal Road",
    status: "under_construction",
    progress: 45,
    launch: "2024-04-01",
    completion: "2027-12-31",
    tagline: "Gated villas and plots on Canal Road",
    description: "The second phase of a gated community with ready-design villas and residential plots, a central park and a community club.",
    amenities: ["Gated Entry", "Central Park", "Community Club", "Mosque", "Underground Electricity"],
    image: "villa",
    units: [
      { type: "plot", name: "5 Marla Plot", sqft: 1_125, price: 4_200_000, total: 300, available: 120 },
      { type: "villa", name: "5 Marla Villa", sqft: 1_125, beds: 3, baths: 3, price: 12_500_000, total: 80, available: 36 },
      { type: "villa", name: "10 Marla Villa", sqft: 2_250, beds: 5, baths: 5, price: 23_000_000, total: 40, available: 19 },
    ],
    plans: [{ name: "3-Year Plan", down: 20, months: 36, frequency: "monthly", possession: 10 }],
  },
  {
    name: "Chenab Heights",
    developer: "Orchard Valley Developers",
    city: "Gujranwala",
    location: "DC Colony",
    status: "pre_launch",
    progress: 0,
    launch: "2026-11-01",
    completion: "2029-12-31",
    tagline: "Apartments in a gated community",
    description: "A planned mid-rise apartment block inside a gated community, with one and two bedroom apartments and ground-floor retail. Bookings open at pre-launch prices.",
    amenities: ["Elevators", "Backup Power", "Parking", "Security", "Retail"],
    image: "apartmentBuilding",
    units: [
      { type: "apartment", name: "1 Bed Apartment", sqft: 650, beds: 1, baths: 1, price: 6_500_000, total: 60, available: 60 },
      { type: "apartment", name: "2 Bed Apartment", sqft: 1_000, beds: 2, baths: 2, price: 9_800_000, total: 60, available: 60 },
    ],
    plans: [{ name: "3-Year Plan", down: 20, months: 36, frequency: "monthly", possession: 15 }],
  },
  {
    name: "Khyber Square",
    developer: "Frontier Crest Builders",
    city: "Peshawar",
    location: "Hayatabad",
    status: "under_construction",
    progress: 50,
    launch: "2024-05-01",
    completion: "2027-08-31",
    tagline: "Apartments and shops in Hayatabad",
    description: "A mixed-use building with ground-floor shops and two and three bedroom apartments above, close to Hayatabad's main markets.",
    amenities: [...STD_AMENITIES.slice(0, 6), "Retail Podium"],
    image: "apartmentBuilding",
    units: [
      { type: "apartment", name: "2 Bed Apartment", sqft: 1_100, beds: 2, baths: 2, price: 13_500_000, total: 48, available: 20 },
      { type: "apartment", name: "3 Bed Apartment", sqft: 1_550, beds: 3, baths: 3, price: 18_500_000, total: 32, available: 14 },
      { type: "shop", name: "Ground Floor Shop", sqft: 280, price: 14_000_000, total: 24, available: 9 },
    ],
    plans: [{ name: "3-Year Plan", down: 25, months: 36, frequency: "quarterly", possession: 10 }],
  },
  {
    name: "Orchard Grove Farmhouses",
    developer: "Skyline Habitat Builders",
    city: "Islamabad",
    location: "Chak Shahzad",
    status: "ready",
    progress: 100,
    launch: "2020-03-01",
    completion: "2024-10-31",
    tagline: "Two and four kanal farmhouse plots",
    description: "A gated farmhouse community with 2 and 4 kanal plots, landscaped lanes and a shared clubhouse, with full possession available.",
    amenities: ["Gated Entry", "Clubhouse", "Landscaped Lanes", "Security", "Water Supply"],
    image: "farmhouse",
    units: [
      { type: "plot", name: "2 Kanal Farmhouse Plot", sqft: 9_000, price: 26_000_000, total: 40, available: 7 },
      { type: "plot", name: "4 Kanal Farmhouse Plot", sqft: 18_000, price: 48_000_000, total: 30, available: 5 },
    ],
    plans: [{ name: "1-Year Plan", down: 40, months: 12, frequency: "monthly", possession: 0 }],
  },
];
