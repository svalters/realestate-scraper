export interface Link {
  url: string;
  name: string;
}

export interface Candidate {
  type: Link;
  region: Link;
  links: Link[];
}

export interface Scraped {
  price: number;
  m2: number;
}

export interface Parse {
  name: string;
  scraped: Scraped[];
}

export interface Measurement extends Scraped {
  priceM2: number;
}

export interface Price {
  meanPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface M2 {
  meanM2: number;
  medianM2: number;
  minM2: number;
  maxM2: number;
}

export interface PriceM2 {
  meanPriceM2: number;
  medianPriceM2: number;
  minPriceM2: number;
  maxPriceM2: number;
}

export interface Stats extends Price, M2, PriceM2 {
  items: number;
}

export interface Entry extends Stats {
  type: string;
  location: string;
  subLocation: string;
}
