export const IS_DEV = process.env.NODE_ENV === "dev";
export const MONGODB_URI =
  process.env.MONGODB_URI || `mongodb://root:example@localhost:27017/scraped?authSource=admin`;

export const SITE_URL = "https://www.ss.com";
export const REAL_ESTATE_URL = `${SITE_URL}/en/real-estate`;
export const LOOKUP_REAL_ESTATE = [
  { url: `${REAL_ESTATE_URL}/flats/`, name: "flats" },
  { url: `${REAL_ESTATE_URL}/homes-summer-residences/`, name: "homes" },
  { url: `${REAL_ESTATE_URL}/plots-and-lands/`, name: "plots_and_lands" }
];

export const LOOKUP_REAL_ESTATE_REGIONS = [
  { url: "riga/", name: "riga" },
  { url: "riga-region/", name: "riga_region" },
  { url: "jurmala/", name: "jurmala" },
  { url: "valmiera-and-reg/", name: "valmiera_region" },
];

export const SELECTORS = {
  category: "h4.category a",
  listPageLink: "div.d1 > a",
  realEstateListPage: {
    table: "#filter_frm table:nth-child(3)"
  },
  next: "a[rel='next']"
};

export const CELL_BLACKLIST = ["-"];
export const PRICE_BLACKLIST = [...CELL_BLACKLIST, "mon", "buy", "day", "enting"];
