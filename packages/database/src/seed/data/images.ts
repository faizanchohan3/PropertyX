/**
 * Photos from Unsplash (Unsplash License: free to use, no attribution required).
 * Used for DEMO listings only; each demo listing is flagged is_seed. Production
 * listings use photos uploaded by sellers to our own storage.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=75`;

export const IMG = {
  houseExterior: [
    "1600596542815-ffad4c1539a9",
    "1600585154340-be6161a56a0c",
    "1512917774080-9991f1c4c750",
    "1564013799919-ab600027ffc6",
    "1580587771525-78b9dba3b914",
    "1613490493576-7fde63acd811",
    "1600566753190-17f0baa2a6c3",
    "1600047509807-ba8f99d2cdde",
    "1523217582562-09d0def993a6",
    "1599809275671-b5942cabc7a2",
  ].map(u),
  villa: ["1582268611958-ebfd161ef9cf", "1613977257363-707ba9348227", "1416331108676-a22ccb276e35", "1599809275671-b5942cabc7a2", "1613490493576-7fde63acd811"].map(u),
  living: [
    "1600607687939-ce8a6c25118c",
    "1502672260266-1c1ef2d93688",
    "1522708323590-d24dbb6b0267",
    "1560448204-e02f11c3d0e2",
    "1493809842364-78817add7ffb",
    "1586023492125-27b2c045efd7",
    "1600210492486-724fe5c67fb0",
    "1600121848594-d8644e57abab",
    "1505691938895-1758d7feb511",
    "1554995207-c18c203602cb",
  ].map(u),
  kitchen: ["1484154218962-a197022b5858", "1617806118233-18e1de247200"].map(u),
  bedroom: ["1595526114035-0d45ed16cfbf"].map(u),
  bathroom: ["1552321554-5fefe8c9ef14", "1584622650111-993a426fbf0a"].map(u),
  apartmentBuilding: ["1545324418-cc1a3fa10c00", "1460317442991-0ec209397118", "1574362848149-11496d93a7c7"].map(u),
  office: ["1497366216548-37526070297c", "1497366811353-6870744d04b2", "1600573472550-8090b5e0745e"].map(u),
  tower: ["1486406146926-c627a92ad1ab"].map(u),
  shop: ["1441986300917-64674bd600d8"].map(u),
  land: ["1500382017468-9049fed747ef", "1558036117-15d82a90b9b1"].map(u),
  aerial: ["1565402170291-8491f14678db"].map(u),
  farmhouse: ["1568605114967-8130f3a36994", "1598228723793-52759bba239c", "1592595896551-12b371d546d5", "1558036117-15d82a90b9b1"].map(u),
  warehouse: ["1586528116311-ad8dd3c8310d", "1553413077-190dd305871c"].map(u),
  construction: ["1504307651254-35680f356dfd", "1541888946425-d81bb19240f5"].map(u),
};
