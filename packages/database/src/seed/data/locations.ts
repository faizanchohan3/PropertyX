/**
 * Seed geography for the demo cities. Place names are real Pakistani localities;
 * coordinates are approximate centroids. Price levels are indicative demo values
 * used only to generate realistic-looking DEMO listings (all flagged is_seed) —
 * they are not market statistics.
 *
 * Prices: PKR per marla (225 sq ft) unless noted.
 */
export type TypeMix = Partial<Record<
  | "house"
  | "flat"
  | "apartment"
  | "upper_portion"
  | "lower_portion"
  | "room"
  | "farmhouse"
  | "villa"
  | "penthouse"
  | "residential_plot"
  | "commercial_plot"
  | "plot_file"
  | "agricultural_land"
  | "office"
  | "shop"
  | "warehouse"
  | "factory"
  | "building",
  number
>>;

export interface LocSeed {
  name: string;
  kind: "area" | "society";
  lat: number;
  lng: number;
  /** house sale price per marla */
  house: number;
  /** plot sale price per marla */
  plot: number;
  /** apartment sale price per sq ft */
  apt?: number;
  /** monthly house rent per marla */
  rent: number;
  /** commercial (office/shop) sale price per sq ft */
  commercial?: number;
  /** agricultural land per acre */
  agriAcre?: number;
  mix: TypeMix;
  blocks?: string[];
  description: string;
  highlights?: string[];
  authority?: string;
  weight?: number;
}

export interface CitySeed {
  name: string;
  province: string;
  district: string;
  lat: number;
  lng: number;
  unit: "marla" | "sqyd";
  listings: number;
  description: string;
  locs: LocSeed[];
}

const HOMES: TypeMix = { house: 50, residential_plot: 18, upper_portion: 5, lower_portion: 5, commercial_plot: 3, shop: 3 };
const APT_HEAVY: TypeMix = { apartment: 30, flat: 20, house: 20, office: 10, shop: 8, penthouse: 4 };
const SOCIETY: TypeMix = { house: 45, residential_plot: 25, plot_file: 4, commercial_plot: 5, apartment: 6, shop: 4, upper_portion: 4, lower_portion: 3 };
const FARM: TypeMix = { farmhouse: 45, agricultural_land: 30, residential_plot: 10, house: 10 };
const COMMERCIAL: TypeMix = { office: 35, shop: 25, building: 8, apartment: 12, commercial_plot: 10, warehouse: 4 };
const INDUSTRIAL: TypeMix = { warehouse: 40, factory: 35, commercial_plot: 15, office: 10 };

export const CITIES: CitySeed[] = [
  {
    name: "Lahore",
    province: "Punjab",
    district: "Lahore",
    lat: 31.5204,
    lng: 74.3587,
    unit: "marla",
    listings: 360,
    description:
      "Lahore, the capital of Punjab, is Pakistan's second-largest city and one of its most active property markets, with established neighbourhoods such as Gulberg and Model Town alongside large planned housing societies on its southern and eastern fringes.",
    locs: [
      { name: "DHA Lahore", kind: "society", lat: 31.4697, lng: 74.4091, house: 4_400_000, plot: 2_300_000, apt: 24_000, rent: 14_000, commercial: 38_000, mix: SOCIETY, blocks: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7", "Phase 8", "Phase 9 Town", "Phase 9 Prism"], authority: "Defence Housing Authority", weight: 3, description: "A planned community developed by the Defence Housing Authority across multiple phases on Lahore's eastern side, known for wide boulevards, commercial zones, parks and high construction standards.", highlights: ["Planned phases with dedicated commercial areas", "Gated with own security and maintenance", "Close to Lahore Ring Road and Allama Iqbal International Airport"] },
      { name: "Bahria Town Lahore", kind: "society", lat: 31.3676, lng: 74.1852, house: 3_300_000, plot: 1_350_000, apt: 14_000, rent: 10_500, commercial: 22_000, mix: SOCIETY, blocks: ["Sector A", "Sector B", "Sector C", "Sector D", "Sector E", "Sector F", "Overseas A", "Overseas B", "Talha Block", "Jasmine Block"], authority: "LDA", weight: 2.2, description: "A large gated township off Canal Road and Multan Road with residential sectors, a central business district, schools, a hospital and recreational landmarks.", highlights: ["Gated township with internal amenities", "Wide range of plot and house sizes", "Access via Canal Road extension and Multan Road"] },
      { name: "Gulberg", kind: "area", lat: 31.5123, lng: 74.3486, house: 6_000_000, plot: 4_500_000, apt: 26_000, rent: 20_000, commercial: 42_000, mix: { ...APT_HEAVY, house: 25 }, blocks: ["Gulberg II", "Gulberg III", "Gulberg IV", "Gulberg V", "MM Alam Road"], weight: 1.6, description: "One of Lahore's central and most established neighbourhoods, combining upscale residences with the city's main commercial, dining and corporate office corridors.", highlights: ["Central location", "Main Boulevard and MM Alam Road commercial corridors", "Established infrastructure"] },
      { name: "Johar Town", kind: "area", lat: 31.4697, lng: 74.2728, house: 3_800_000, plot: 2_500_000, apt: 15_000, rent: 9_000, commercial: 26_000, mix: HOMES, blocks: ["Block A", "Block B", "Block C", "Block D", "Block E", "Block G", "Block H", "Block J", "Block R"], authority: "LDA", weight: 1.6, description: "A large LDA-planned residential scheme in south-west Lahore with a mix of family homes, educational institutions and commercial markets, connected via Canal Road and the Orange Line corridor.", highlights: ["LDA approved scheme", "Close to Emporium Mall and Expo Centre", "Strong rental demand from students and professionals"] },
      { name: "Model Town", kind: "area", lat: 31.4835, lng: 74.3255, house: 5_000_000, plot: 3_500_000, rent: 15_000, mix: { house: 60, residential_plot: 15, upper_portion: 10, lower_portion: 10, shop: 3 }, blocks: ["Block A", "Block B", "Block C", "Block D", "Block E", "Block F", "Block G", "Block H", "Block J", "Block K"], weight: 1, description: "A historic, leafy garden-town neighbourhood laid out in the early 20th century with large plots, mature trees and a central park.", highlights: ["Mature greenery and large plots", "Established community", "Central Model Town Park"] },
      { name: "Lake City", kind: "society", lat: 31.3854, lng: 74.2588, house: 3_600_000, plot: 1_800_000, rent: 9_000, mix: SOCIETY, blocks: ["Sector M-1", "Sector M-2", "Sector M-3", "Sector M-5", "Sector M-7"], authority: "LDA", weight: 1, description: "A gated community off Raiwind Road built around a golf course, offering mostly larger plots and modern villas.", highlights: ["Golf course community", "Gated with low density", "Raiwind Road access"] },
      { name: "Wapda Town", kind: "area", lat: 31.4383, lng: 74.2638, house: 3_200_000, plot: 2_000_000, rent: 8_000, mix: HOMES, blocks: ["Phase 1", "Phase 2", "Block E1", "Block F1", "Block J2"], weight: 0.9, description: "An established residential society near Raiwind Road and Johar Town with developed infrastructure and markets.", highlights: ["Developed society", "Close to Johar Town", "Good value per marla"] },
      { name: "Valencia Town", kind: "society", lat: 31.4045, lng: 74.2589, house: 3_000_000, plot: 1_700_000, rent: 8_000, mix: SOCIETY, blocks: ["Block A", "Block B", "Block C", "Block D"], weight: 0.6, description: "A planned gated housing society along Defence Road with residential blocks, a commercial area and parks.", highlights: ["Gated society", "Defence Road access"] },
      { name: "Bhatta Chowk", kind: "area", lat: 31.4830, lng: 74.4030, house: 2_400_000, plot: 1_500_000, rent: 6_500, commercial: 15_000, mix: { house: 55, upper_portion: 10, lower_portion: 10, residential_plot: 12, shop: 6, flat: 7 }, weight: 0.8, description: "A busy, mixed neighbourhood beside DHA Phases 3 and 4 and the airport road, offering more affordable homes close to DHA amenities.", highlights: ["Close to DHA and the airport", "Affordable compared with DHA"] },
      { name: "Lahore Motorway City", kind: "society", lat: 31.6123, lng: 74.2205, house: 1_650_000, plot: 550_000, rent: 4_500, mix: { ...SOCIETY, house: 40, residential_plot: 35 }, blocks: ["Block R", "Block S", "Block T", "Overseas Block"], weight: 0.9, description: "A gated housing society near the Lahore–Islamabad Motorway (M-2) with plots and newly built homes at lower price points.", highlights: ["Lower entry prices", "Motorway access", "New construction"] },
      { name: "Bedian Road", kind: "area", lat: 31.4320, lng: 74.4870, house: 2_400_000, plot: 1_500_000, rent: 6_000, agriAcre: 30_000_000, mix: FARM, weight: 0.7, description: "A semi-rural corridor south-east of DHA popular for farmhouses and agricultural land.", highlights: ["Farmhouses and open land", "Close to DHA Lahore"] },
      { name: "Sundar Industrial Estate", kind: "area", lat: 31.3060, lng: 74.1840, house: 1_500_000, plot: 1_600_000, rent: 4_000, commercial: 9_000, mix: INDUSTRIAL, weight: 0.4, description: "An industrial estate off Raiwind Road with plots for factories and warehouses.", highlights: ["Industrial zoning", "Motorway access"] },
    ],
  },
  {
    name: "Islamabad",
    province: "Islamabad Capital Territory",
    district: "Islamabad",
    lat: 33.6844,
    lng: 73.0479,
    unit: "marla",
    listings: 230,
    description:
      "Pakistan's planned capital, organised into lettered sectors at the foot of the Margalla Hills, with CDA sectors, private housing societies and a commercial spine along the Blue Area.",
    locs: [
      { name: "F-7", kind: "area", lat: 33.7217, lng: 73.0565, house: 13_000_000, plot: 8_000_000, apt: 35_000, rent: 30_000, commercial: 55_000, mix: { house: 60, upper_portion: 10, lower_portion: 10, residential_plot: 8, shop: 6, office: 6 }, blocks: ["F-7/1", "F-7/2", "F-7/3", "F-7/4"], authority: "CDA", weight: 0.8, description: "A prime CDA sector near the Margalla Hills with large homes, Jinnah Super Market and diplomatic and corporate tenants.", highlights: ["Prime central sector", "Jinnah Super Market", "Close to Margalla Hills trails"] },
      { name: "F-11", kind: "area", lat: 33.6848, lng: 72.9950, house: 6_000_000, plot: 4_500_000, apt: 30_000, rent: 18_000, commercial: 45_000, mix: { house: 40, apartment: 25, upper_portion: 8, lower_portion: 8, residential_plot: 8, shop: 5, office: 6 }, blocks: ["F-11/1", "F-11/2", "F-11/3", "F-11/4", "F-11 Markaz"], authority: "CDA", weight: 1, description: "A well-developed CDA sector with family homes, apartment towers around the Markaz and easy access to Kashmir Highway.", highlights: ["F-11 Markaz commercial hub", "Apartment towers", "Kashmir Highway access"] },
      { name: "E-11", kind: "area", lat: 33.6990, lng: 72.9727, house: 4_000_000, plot: 3_000_000, apt: 18_000, rent: 12_000, mix: { apartment: 35, flat: 10, house: 35, upper_portion: 8, lower_portion: 7, shop: 5 }, blocks: ["E-11/1", "E-11/2", "E-11/3", "E-11/4"], weight: 1, description: "A residential sector next to the Margalla Hills with private housing societies and a large stock of apartments.", highlights: ["Popular for apartments", "Margalla views", "Close to F-10 and F-11"] },
      { name: "G-13", kind: "area", lat: 33.6510, lng: 72.9662, house: 5_000_000, plot: 3_000_000, rent: 12_000, mix: HOMES, blocks: ["G-13/1", "G-13/2", "G-13/3", "G-13/4"], authority: "CDA", weight: 1, description: "A CDA sector on Srinagar Highway with compact family homes and steady rental demand from students and government employees.", highlights: ["Srinagar Highway access", "Compact family homes", "Near NUST"] },
      { name: "DHA Islamabad", kind: "society", lat: 33.5297, lng: 73.1588, house: 3_500_000, plot: 1_800_000, apt: 16_000, rent: 10_000, commercial: 25_000, mix: SOCIETY, blocks: ["Phase 2 Sector A", "Phase 2 Sector B", "Phase 2 Sector C", "Phase 2 Sector D", "Phase 2 Sector E", "Phase 5"], authority: "Defence Housing Authority", weight: 1.4, description: "DHA's planned community along the GT Road / Islamabad Expressway corridor with large sectors, a golf course and commercial areas.", highlights: ["Islamabad Expressway access", "Gated sectors", "Golf course"] },
      { name: "Bahria Enclave", kind: "society", lat: 33.7105, lng: 73.2200, house: 2_800_000, plot: 1_200_000, rent: 7_000, mix: SOCIETY, blocks: ["Sector A", "Sector C", "Sector F", "Sector H", "Sector I"], weight: 0.8, description: "A hillside gated community near Bani Gala and Park Road with scenic plots and villas.", highlights: ["Scenic hillside setting", "Gated community"] },
      { name: "B-17 Multi Gardens", kind: "society", lat: 33.6870, lng: 72.8370, house: 2_500_000, plot: 1_200_000, rent: 6_000, mix: SOCIETY, blocks: ["Block A", "Block B", "Block C", "Block D", "Block E", "Block F"], authority: "CDA", weight: 0.9, description: "A CDA-approved housing society on GT Road west of the city with affordable plots and new construction.", highlights: ["Affordable entry point", "GT Road access", "CDA approved"] },
      { name: "Chak Shahzad", kind: "area", lat: 33.6700, lng: 73.1400, house: 3_000_000, plot: 1_500_000, rent: 9_000, agriAcre: 60_000_000, mix: FARM, weight: 0.5, description: "A farmhouse belt on Park Road between Islamabad and Bani Gala.", highlights: ["Farmhouse belt", "Park Road access"] },
      { name: "Blue Area", kind: "area", lat: 33.7104, lng: 73.0606, house: 10_000_000, plot: 15_000_000, apt: 32_000, rent: 25_000, commercial: 60_000, mix: COMMERCIAL, weight: 0.6, description: "Islamabad's central business district along Jinnah Avenue with high-rise offices, banks and retail.", highlights: ["Central business district", "Jinnah Avenue frontage"] },
    ],
  },
  {
    name: "Karachi",
    province: "Sindh",
    district: "Karachi",
    lat: 24.8607,
    lng: 67.0011,
    unit: "sqyd",
    listings: 270,
    description:
      "Pakistan's largest city and economic hub on the Arabian Sea, with a property market spanning seaside DHA and Clifton, dense central neighbourhoods, apartment-heavy districts and large new townships on the Superhighway.",
    locs: [
      { name: "DHA Karachi", kind: "society", lat: 24.7963, lng: 67.0573, house: 6_000_000, plot: 3_500_000, apt: 22_000, rent: 17_000, commercial: 40_000, mix: { house: 40, apartment: 20, residential_plot: 15, commercial_plot: 5, shop: 8, office: 8, penthouse: 4 }, blocks: ["Phase 2 Extension", "Phase 4", "Phase 5", "Phase 6", "Phase 7", "Phase 8"], authority: "Defence Housing Authority", weight: 2.4, description: "Karachi's seaside DHA spans several phases along the coast with bungalows, apartment buildings and the Khayaban commercial corridors.", highlights: ["Seaside location", "Established commercial areas", "Sea View and Do Darya nearby"] },
      { name: "Clifton", kind: "area", lat: 24.8138, lng: 67.0300, house: 5_500_000, plot: 3_800_000, apt: 25_000, rent: 18_000, commercial: 45_000, mix: APT_HEAVY, blocks: ["Block 2", "Block 4", "Block 5", "Block 7", "Block 8", "Block 9"], weight: 1.4, description: "An upscale coastal neighbourhood with apartment towers, bungalows, shopping centres and the Sea View promenade.", highlights: ["Coastal living", "Apartment towers", "Shopping and dining"] },
      { name: "Gulshan-e-Iqbal", kind: "area", lat: 24.9180, lng: 67.0971, house: 4_500_000, plot: 3_000_000, apt: 13_000, rent: 8_000, commercial: 24_000, mix: { apartment: 35, flat: 15, house: 25, upper_portion: 5, lower_portion: 5, shop: 10 }, blocks: ["Block 1", "Block 2", "Block 4", "Block 5", "Block 6", "Block 7", "Block 10", "Block 13-D"], weight: 1.6, description: "A large, central residential district with a deep stock of apartments, universities and the University Road commercial corridor.", highlights: ["Central location", "University Road access", "Affordable apartments"] },
      { name: "PECHS", kind: "area", lat: 24.8710, lng: 67.0638, house: 5_000_000, plot: 3_600_000, apt: 16_000, rent: 11_000, commercial: 32_000, mix: { house: 35, apartment: 25, upper_portion: 8, office: 12, shop: 12, building: 4 }, blocks: ["Block 2", "Block 3", "Block 6"], weight: 0.9, description: "The Pakistan Employees Cooperative Housing Society — a central neighbourhood near Shahrah-e-Faisal and Tariq Road shopping.", highlights: ["Shahrah-e-Faisal access", "Tariq Road shopping"] },
      { name: "North Nazimabad", kind: "area", lat: 24.9425, lng: 67.0435, house: 4_000_000, plot: 2_800_000, apt: 12_000, rent: 8_000, mix: { house: 35, apartment: 30, upper_portion: 10, lower_portion: 10, shop: 8, residential_plot: 5 }, blocks: ["Block A", "Block B", "Block H", "Block L", "Block N"], weight: 1, description: "An established planned district in central-north Karachi with family homes, apartments and schools.", highlights: ["Established family area", "Good schools nearby"] },
      { name: "Bahria Town Karachi", kind: "society", lat: 25.0047, lng: 67.3115, house: 2_600_000, plot: 900_000, apt: 10_000, rent: 5_000, commercial: 15_000, mix: { villa: 25, house: 15, residential_plot: 20, apartment: 20, commercial_plot: 6, shop: 8, plot_file: 6 }, blocks: ["Precinct 1", "Precinct 2", "Precinct 6", "Precinct 10", "Precinct 11-A", "Precinct 19", "Precinct 27", "Precinct 31"], weight: 1.6, description: "A large township on the M-9 Superhighway with gated precincts of villas and apartments, a theme park and commercial districts.", highlights: ["Gated precincts", "Ready villas and apartments", "M-9 Motorway access"] },
      { name: "Scheme 33", kind: "area", lat: 24.9500, lng: 67.1500, house: 2_800_000, plot: 1_500_000, apt: 10_000, rent: 6_000, mix: SOCIETY, blocks: ["Gulzar-e-Hijri", "Saadi Town", "Karachi University Society", "Sector 18-A"], weight: 0.8, description: "A large KDA scheme along the Superhighway with many cooperative societies offering plots and new homes.", highlights: ["Plots for new construction", "Superhighway access"] },
      { name: "Gulistan-e-Jauhar", kind: "area", lat: 24.9180, lng: 67.1307, house: 3_500_000, plot: 2_400_000, apt: 11_000, rent: 6_500, mix: { apartment: 45, flat: 15, house: 20, shop: 10, upper_portion: 5 }, blocks: ["Block 1", "Block 3", "Block 7", "Block 12", "Block 15", "Block 18"], weight: 1, description: "A dense residential area known for apartment complexes, close to Rashid Minhas Road and the airport.", highlights: ["Apartment complexes", "Close to the airport"] },
      { name: "SITE Area", kind: "area", lat: 24.9020, lng: 66.9980, house: 1_800_000, plot: 2_600_000, rent: 5_000, commercial: 12_000, mix: INDUSTRIAL, weight: 0.5, description: "The Sindh Industrial Trading Estate — one of Karachi's oldest industrial zones with factories and warehouses.", highlights: ["Industrial zoning", "Close to the port"] },
    ],
  },
  {
    name: "Rawalpindi",
    province: "Punjab",
    district: "Rawalpindi",
    lat: 33.5651,
    lng: 73.0169,
    unit: "marla",
    listings: 160,
    description: "Islamabad's twin city, combining dense historic markets and cantonment areas with large private housing schemes to its south along GT Road and the Expressway.",
    locs: [
      { name: "Bahria Town Rawalpindi", kind: "society", lat: 33.4975, lng: 73.0900, house: 2_900_000, plot: 1_400_000, apt: 13_000, rent: 9_000, commercial: 22_000, mix: SOCIETY, blocks: ["Phase 3", "Phase 4", "Phase 7", "Phase 8 Awami Villas", "Phase 8 Sector F", "Phase 8 Usman Block", "Safari Valley"], weight: 2, description: "The Rawalpindi phases of Bahria Town along GT Road and the Expressway with residential sectors, commercial areas and recreational facilities.", highlights: ["Gated phases", "Established commercial hubs", "Expressway access"] },
      { name: "DHA Rawalpindi Phase 1", kind: "society", lat: 33.5390, lng: 73.1040, house: 3_800_000, plot: 2_200_000, rent: 11_000, mix: SOCIETY, blocks: ["Sector A", "Sector B", "Sector C", "Sector D", "Sector E", "Sector F"], authority: "Defence Housing Authority", weight: 1, description: "DHA's first phase in the twin cities with developed sectors and proximity to the Islamabad Expressway.", highlights: ["Developed and populated", "Expressway access"] },
      { name: "Satellite Town", kind: "area", lat: 33.6345, lng: 73.0700, house: 3_500_000, plot: 2_400_000, rent: 9_000, commercial: 25_000, mix: HOMES, blocks: ["Block A", "Block B", "Block C", "Block D", "Block E", "Block F"], weight: 1, description: "A central Rawalpindi neighbourhood along Murree Road with busy markets and family homes.", highlights: ["Murree Road access", "Commercial markets"] },
      { name: "Chaklala Scheme 3", kind: "area", lat: 33.5880, lng: 73.0830, house: 4_000_000, plot: 2_600_000, rent: 11_000, mix: HOMES, weight: 0.7, description: "A well-maintained residential scheme near the airport and Airport Road with larger family homes.", highlights: ["Quiet residential area", "Near Airport Road"] },
      { name: "Saddar", kind: "area", lat: 33.5970, lng: 73.0480, house: 3_500_000, plot: 3_000_000, apt: 12_000, rent: 10_000, commercial: 30_000, mix: COMMERCIAL, weight: 0.7, description: "Rawalpindi's historic commercial centre with retail markets, offices and apartments.", highlights: ["Commercial centre", "Metro Bus access"] },
      { name: "Gulraiz Housing Scheme", kind: "society", lat: 33.5760, lng: 73.1160, house: 2_200_000, plot: 1_200_000, rent: 6_000, mix: SOCIETY, blocks: ["Phase 1", "Phase 2", "Phase 3"], weight: 0.6, description: "A mid-market housing scheme off Airport Road and Khanna Road.", highlights: ["Affordable homes", "Airport Road access"] },
    ],
  },
  {
    name: "Multan",
    province: "Punjab",
    district: "Multan",
    lat: 30.1575,
    lng: 71.5249,
    unit: "marla",
    listings: 120,
    description: "The largest city of southern Punjab, with growing planned societies along Bosan Road and the Multan–Lahore and Multan–Sukkur motorway corridors.",
    locs: [
      { name: "DHA Multan", kind: "society", lat: 30.1120, lng: 71.5940, house: 2_200_000, plot: 900_000, rent: 5_500, commercial: 15_000, mix: SOCIETY, blocks: ["Sector J", "Sector K", "Sector M", "Sector N", "Sector R", "Sector T"], authority: "Defence Housing Authority", weight: 1.3, description: "DHA's planned community in Multan with gated sectors, a central commercial area and parks.", highlights: ["Gated sectors", "Developing community"] },
      { name: "Buch Executive Villas", kind: "society", lat: 30.2550, lng: 71.4970, house: 2_000_000, plot: 800_000, rent: 5_000, mix: SOCIETY, blocks: ["Block A", "Block B", "Block C", "Block D", "Block E"], weight: 0.8, description: "A gated society on Bosan Road with villas, plots and community facilities.", highlights: ["Gated community", "Bosan Road access"] },
      { name: "Wapda Town Multan", kind: "society", lat: 30.2165, lng: 71.4705, house: 2_000_000, plot: 1_000_000, rent: 5_000, mix: SOCIETY, blocks: ["Phase 1", "Phase 2"], weight: 0.8, description: "An established society with developed blocks and markets.", highlights: ["Developed society"] },
      { name: "Gulgasht Colony", kind: "area", lat: 30.2215, lng: 71.4830, house: 2_500_000, plot: 1_600_000, rent: 6_000, commercial: 18_000, mix: HOMES, weight: 0.9, description: "A central residential and commercial neighbourhood of Multan with established markets.", highlights: ["Central location", "Commercial markets"] },
      { name: "Bosan Road", kind: "area", lat: 30.2350, lng: 71.4700, house: 2_200_000, plot: 1_200_000, rent: 5_500, commercial: 16_000, mix: { ...HOMES, shop: 8, office: 5 }, weight: 0.8, description: "A major corridor towards Bahauddin Zakariya University lined with societies, schools and businesses.", highlights: ["University nearby", "Growing corridor"] },
      { name: "Northern Bypass", kind: "area", lat: 30.2600, lng: 71.5600, house: 1_400_000, plot: 600_000, rent: 3_500, agriAcre: 9_000_000, mix: FARM, weight: 0.5, description: "Peri-urban land along Multan's Northern Bypass with farmhouses and agricultural parcels.", highlights: ["Agricultural land", "Bypass access"] },
    ],
  },
  {
    name: "Faisalabad",
    province: "Punjab",
    district: "Faisalabad",
    lat: 31.4504,
    lng: 73.1350,
    unit: "marla",
    listings: 120,
    description: "Pakistan's textile capital, with established central colonies, the Clock Tower bazaars and newer planned societies along Canal Road and Sargodha Road.",
    locs: [
      { name: "Canal Road", kind: "area", lat: 31.4300, lng: 73.1200, house: 2_300_000, plot: 1_200_000, rent: 5_500, mix: HOMES, weight: 0.9, description: "Residential developments along the Rakh Branch canal with access to the motorway interchange.", highlights: ["Canal-side living", "Motorway access"] },
      { name: "Peoples Colony", kind: "area", lat: 31.4130, lng: 73.0960, house: 2_800_000, plot: 1_800_000, rent: 6_500, commercial: 18_000, mix: HOMES, blocks: ["Peoples Colony No 1", "Peoples Colony No 2"], weight: 1, description: "One of Faisalabad's established central neighbourhoods with family homes and the D-Ground commercial area nearby.", highlights: ["Central location", "Near D-Ground"] },
      { name: "Madina Town", kind: "area", lat: 31.4250, lng: 73.1110, house: 3_000_000, plot: 2_000_000, rent: 7_000, commercial: 22_000, mix: { ...HOMES, shop: 8, office: 6 }, blocks: ["Block W", "Block X", "Block Y", "Block Z"], weight: 1, description: "An upscale Faisalabad neighbourhood around Susan Road with homes, hospitals and commercial plazas.", highlights: ["Susan Road commercial area", "Hospitals and schools"] },
      { name: "Citi Housing Faisalabad", kind: "society", lat: 31.3730, lng: 73.0400, house: 1_500_000, plot: 700_000, rent: 4_000, mix: SOCIETY, blocks: ["Block A", "Block B", "Block C", "Block D"], weight: 0.8, description: "A gated society on Jhang Road offering plots and new homes.", highlights: ["Gated society", "Affordable plots"] },
      { name: "Eden Valley", kind: "society", lat: 31.4140, lng: 73.0570, house: 2_000_000, plot: 900_000, rent: 5_000, mix: SOCIETY, weight: 0.6, description: "A planned society on Canal Road with residential and commercial plots.", highlights: ["Canal Road access"] },
      { name: "Sargodha Road Industrial Area", kind: "area", lat: 31.4800, lng: 73.0700, house: 1_400_000, plot: 900_000, rent: 3_500, commercial: 8_000, agriAcre: 15_000_000, mix: { ...INDUSTRIAL, agricultural_land: 15 }, weight: 0.5, description: "An industrial and peri-urban corridor with factories, warehouses and agricultural land.", highlights: ["Industrial units", "Agricultural land"] },
    ],
  },
  {
    name: "Gujranwala",
    province: "Punjab",
    district: "Gujranwala",
    lat: 32.1877,
    lng: 74.1945,
    unit: "marla",
    listings: 80,
    description: "An industrial city on the GT Road between Lahore and Rawalpindi with established colonies and newer gated communities.",
    locs: [
      { name: "Citi Housing Gujranwala", kind: "society", lat: 32.2310, lng: 74.1690, house: 1_400_000, plot: 600_000, rent: 4_000, mix: SOCIETY, blocks: ["Block A", "Block B", "Block C", "Block D", "Block E", "Block F"], weight: 1.2, description: "A large gated society on the GT Road bypass with planned blocks and community amenities.", highlights: ["Gated society", "Planned blocks"] },
      { name: "DC Colony", kind: "society", lat: 32.2270, lng: 74.1670, house: 2_200_000, plot: 1_200_000, rent: 5_000, mix: SOCIETY, blocks: ["Ravi Block", "Chenab Block", "Jhelum Block", "Indus Block"], weight: 1, description: "A well-maintained gated community with developed blocks, markets and parks.", highlights: ["Developed blocks", "Gated community"] },
      { name: "Model Town Gujranwala", kind: "area", lat: 32.1660, lng: 74.1830, house: 2_000_000, plot: 1_300_000, rent: 4_500, commercial: 14_000, mix: HOMES, weight: 0.8, description: "An established central neighbourhood with family homes and markets.", highlights: ["Central location"] },
      { name: "Satellite Town Gujranwala", kind: "area", lat: 32.1800, lng: 74.1590, house: 1_800_000, plot: 1_100_000, rent: 4_000, mix: HOMES, weight: 0.7, description: "A residential area close to the city centre with mixed housing.", highlights: ["Close to city centre"] },
      { name: "Master City Housing", kind: "society", lat: 32.2700, lng: 74.1600, house: 1_200_000, plot: 500_000, rent: 3_500, mix: SOCIETY, weight: 0.6, description: "A newer gated scheme north of the city with installment plots.", highlights: ["Installment plots", "New development"] },
    ],
  },
  {
    name: "Peshawar",
    province: "Khyber Pakhtunkhwa",
    district: "Peshawar",
    lat: 34.0151,
    lng: 71.5249,
    unit: "marla",
    listings: 100,
    description: "The capital of Khyber Pakhtunkhwa, with planned townships such as Hayatabad, established University Town and growing schemes on Ring Road and Warsak Road.",
    locs: [
      { name: "Hayatabad", kind: "area", lat: 33.9980, lng: 71.4440, house: 3_200_000, plot: 2_000_000, rent: 7_000, commercial: 20_000, mix: HOMES, blocks: ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7"], authority: "PDA", weight: 1.6, description: "A planned PDA township on Peshawar's western edge with sectored phases, parks and markets.", highlights: ["Planned township", "Sectored phases", "Parks and markets"] },
      { name: "University Town", kind: "area", lat: 34.0080, lng: 71.4860, house: 3_500_000, plot: 2_400_000, rent: 9_000, commercial: 22_000, mix: { house: 45, upper_portion: 10, lower_portion: 10, office: 12, shop: 10, residential_plot: 6 }, weight: 1, description: "An established area around the University of Peshawar with large homes, NGOs and offices.", highlights: ["Established neighbourhood", "Offices and institutions"] },
      { name: "DHA Peshawar", kind: "society", lat: 33.9880, lng: 71.6300, house: 1_800_000, plot: 600_000, rent: 4_000, mix: SOCIETY, blocks: ["Sector A", "Sector B", "Sector C"], authority: "Defence Housing Authority", weight: 0.8, description: "DHA's developing community on the eastern side of Peshawar.", highlights: ["Developing community", "Gated sectors"] },
      { name: "Regi Model Town", kind: "society", lat: 34.0200, lng: 71.4050, house: 1_400_000, plot: 700_000, rent: 3_500, mix: SOCIETY, blocks: ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5"], authority: "PDA", weight: 0.7, description: "A large PDA scheme west of the city with zones of residential plots.", highlights: ["PDA scheme", "Affordable plots"] },
      { name: "Gulbahar", kind: "area", lat: 34.0220, lng: 71.5820, house: 2_000_000, plot: 1_400_000, rent: 5_000, mix: HOMES, weight: 0.6, description: "A dense, central Peshawar neighbourhood with family homes and markets.", highlights: ["Central location"] },
      { name: "Warsak Road", kind: "area", lat: 34.0400, lng: 71.5200, house: 1_500_000, plot: 900_000, rent: 4_000, agriAcre: 10_000_000, mix: { ...HOMES, agricultural_land: 10, farmhouse: 8 }, weight: 0.6, description: "A growing corridor north-west of the city with new homes, schools and farmland.", highlights: ["Growing corridor", "Farmland"] },
    ],
  },
  {
    name: "Sahiwal",
    province: "Punjab",
    district: "Sahiwal",
    lat: 30.6682,
    lng: 73.1114,
    unit: "marla",
    listings: 50,
    description:
      "A divisional headquarters on the N-5 between Lahore and Multan, known for its livestock and dairy economy. The market is mostly family houses in established colonies, with newer plotted schemes along the main roads and agricultural land on the outskirts.",
    locs: [
      { name: "Farid Town", kind: "area", lat: 30.6560, lng: 73.0960, house: 2_100_000, plot: 1_200_000, rent: 4_500, commercial: 12_000, mix: HOMES, blocks: ["Block A", "Block B", "Block C"], description: "One of Sahiwal's best-known residential neighbourhoods, with larger family houses, schools and clinics nearby." },
      { name: "Civil Lines Sahiwal", kind: "area", lat: 30.6700, lng: 73.1060, house: 2_400_000, plot: 1_500_000, rent: 5_000, commercial: 14_000, mix: { house: 55, upper_portion: 10, lower_portion: 10, residential_plot: 10, office: 8, shop: 7 }, weight: 0.7, description: "Central, older part of the city close to district offices, courts and the main hospitals." },
      { name: "Pakpattan Road", kind: "area", lat: 30.6450, lng: 73.1250, house: 1_600_000, plot: 750_000, rent: 3_500, commercial: 10_000, mix: { ...HOMES, residential_plot: 28, commercial_plot: 6 }, description: "Growing corridor towards Pakpattan with newer housing schemes and roadside commercial plots." },
      { name: "GT Road Sahiwal", kind: "area", lat: 30.6800, lng: 73.0850, house: 1_700_000, plot: 900_000, rent: 3_800, commercial: 11_000, mix: { ...HOMES, shop: 10, commercial_plot: 8, warehouse: 3 }, weight: 0.8, description: "Property along the N-5 national highway, mixing homes with shops, showrooms and small warehouses." },
      { name: "Sahiwal Outskirts", kind: "area", lat: 30.7000, lng: 73.1600, house: 1_200_000, plot: 450_000, rent: 3_000, agriAcre: 6_500_000, mix: FARM, weight: 0.5, description: "Farmland and farmhouses around the city, mostly canal-irrigated agricultural land." },
    ],
  },
  {
    name: "Burewala",
    province: "Punjab",
    district: "Vehari",
    lat: 30.1667,
    lng: 72.65,
    unit: "marla",
    listings: 40,
    description:
      "A cotton-belt city in Vehari district with a large grain market and a textile industry. Demand is mostly from local families and traders, for houses, shops and plots near the main roads, plus agricultural land in the surrounding villages.",
    locs: [
      { name: "Model Town Burewala", kind: "area", lat: 30.1600, lng: 72.6650, house: 1_700_000, plot: 900_000, rent: 3_500, mix: HOMES, blocks: ["Block A", "Block B"], description: "Planned residential area with family houses and wide streets, popular with local business families." },
      { name: "Vehari Road Burewala", kind: "area", lat: 30.1550, lng: 72.6300, house: 1_400_000, plot: 650_000, rent: 3_000, commercial: 9_000, mix: { ...HOMES, residential_plot: 26, commercial_plot: 6 }, description: "Expanding road towards Vehari with newer housing schemes and roadside commercial plots." },
      { name: "Ghalla Mandi Burewala", kind: "area", lat: 30.1700, lng: 72.6500, house: 1_500_000, plot: 1_100_000, rent: 3_500, commercial: 12_000, mix: { shop: 30, warehouse: 15, house: 30, upper_portion: 10, commercial_plot: 10, office: 5 }, weight: 0.7, description: "The commercial heart around the grain market, with shops, godowns and older houses." },
      { name: "Arifwala Road Burewala", kind: "area", lat: 30.1850, lng: 72.6750, house: 1_200_000, plot: 500_000, rent: 2_800, agriAcre: 5_500_000, mix: { ...FARM, residential_plot: 20 }, weight: 0.6, description: "Edge of the city towards Arifwala, with plots, farmhouses and agricultural land." },
    ],
  },
  {
    name: "Vehari",
    province: "Punjab",
    district: "Vehari",
    lat: 30.0453,
    lng: 72.3489,
    unit: "marla",
    listings: 35,
    description:
      "A district headquarters in southern Punjab surrounded by cotton and wheat farmland. Most transactions involve family houses, residential plots and agricultural land.",
    locs: [
      { name: "Model Town Vehari", kind: "area", lat: 30.0400, lng: 72.3550, house: 1_600_000, plot: 850_000, rent: 3_300, mix: HOMES, blocks: ["Block A", "Block B"], description: "Established residential neighbourhood close to schools and the city centre." },
      { name: "Multan Road Vehari", kind: "area", lat: 30.0350, lng: 72.3200, house: 1_300_000, plot: 600_000, rent: 2_900, commercial: 9_000, mix: { ...HOMES, residential_plot: 26, commercial_plot: 6, shop: 6 }, description: "Main approach road from Multan with new plotted schemes and roadside shops." },
      { name: "Burewala Road Vehari", kind: "area", lat: 30.0550, lng: 72.3750, house: 1_300_000, plot: 550_000, rent: 2_800, mix: { ...HOMES, residential_plot: 28 }, weight: 0.8, description: "Growing residential belt along the road to Burewala." },
      { name: "Mailsi Road Vehari", kind: "area", lat: 30.0200, lng: 72.3400, house: 1_100_000, plot: 400_000, rent: 2_500, agriAcre: 5_000_000, mix: FARM, weight: 0.5, description: "Agricultural land and farmhouses south of the city." },
    ],
  },
  {
    name: "Mian Channu",
    province: "Punjab",
    district: "Khanewal",
    lat: 30.44,
    lng: 72.355,
    unit: "marla",
    listings: 30,
    description:
      "A town in Khanewal district on the N-5, between Sahiwal and Multan, serving the surrounding farming villages. The market is small: family houses, shops along the highway and agricultural land.",
    locs: [
      { name: "Model Town Mian Channu", kind: "area", lat: 30.4450, lng: 72.3600, house: 1_400_000, plot: 700_000, rent: 3_000, mix: HOMES, description: "Residential area with family houses close to the town centre." },
      { name: "GT Road Mian Channu", kind: "area", lat: 30.4400, lng: 72.3450, house: 1_300_000, plot: 800_000, rent: 3_000, commercial: 9_000, mix: { ...HOMES, shop: 12, commercial_plot: 10 }, description: "Highway frontage with shops, petrol-pump plots and homes behind the main road." },
      { name: "Tulamba Road Mian Channu", kind: "area", lat: 30.4600, lng: 72.3300, house: 1_000_000, plot: 400_000, rent: 2_500, agriAcre: 5_000_000, mix: { ...FARM, residential_plot: 18 }, weight: 0.7, description: "Road towards historic Tulamba with plots, farmhouses and agricultural land." },
    ],
  },
];
