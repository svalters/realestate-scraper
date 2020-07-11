import { sortBy, meanBy, minBy, maxBy, floor, deburr, snakeCase } from "lodash";
import {
  LOOKUP_REAL_ESTATE_REGIONS,
  SITE_URL,
  IS_DEV,
  LOOKUP_REAL_ESTATE,
  PRICE_BLACKLIST,
  CELL_BLACKLIST,
} from "./constants";
import { Scraped, Stats, Entry, Measurement, Candidate, Parse } from "./types";

/**
 * Output logs if enabled
 *
 * @param message
 * @param key
 * @param rest
 */
export const logger = (message = "", key = "INFO", ...rest: any[]): void => {
  if (IS_DEV) console.log(`${key}: ${message}`, ...rest);
};

/**
 *  Return site full url path
 *
 * @param path
 */
export const getSiteUrl = (path: string): string => `${SITE_URL}${path}`;

/**
 * Return sell location url
 *
 * @param locationUrl
 */
export const getSellUrl = (locationUrl: string): string => `${getSiteUrl(locationUrl)}sell/filter/`;

/**
 * Normalize text for db
 *
 * @param text
 */
export const normalizeText = (text: string) => snakeCase(deburr(text));

/**
 * Returns link lists for types and regions
 */
export const getRootLinks = () => {
  const links: Omit<Candidate, "links">[] = [];
  LOOKUP_REAL_ESTATE.forEach((type) => {
    LOOKUP_REAL_ESTATE_REGIONS.forEach(({ url, name }) => {
      links.push({
        type,
        region: {
          url: `${type.url}${url}`,
          name,
        },
      });
    });
  });
  return links;
};

/**
 * Return parsed price result
 *
 * @param priceCandidate
 */
export const getPrice = (priceCandidate: string) => {
  if (priceCandidate && !PRICE_BLACKLIST.some((item) => priceCandidate.includes(item))) {
    const price = parseFloat(priceCandidate.replace(/,/g, ""));
    if (isFinite(price)) return price;
  }
  return 0;
};

/**
 * return parsed m2 result
 *
 * @param m2Candidate
 */
export const getM2 = (m2Candidate: string) => {
  if (m2Candidate && !CELL_BLACKLIST.some((item) => m2Candidate.includes(item))) {
    let m2 = parseFloat(m2Candidate.replace(/,/g, ""));
    if (m2Candidate.includes("ha")) m2 = m2 * 10000;
    if (isFinite(m2)) return m2;
  }
  return 0;
};

/**
 * @param data
 */
export const calculatePriceM2 = (data: Scraped[]): Measurement[] => {
  return data.map((item) => ({
    ...item,
    priceM2: item.price / item.m2,
  }));
};

/**
 * @param data
 * @param key
 */
export const getMedian = (data: Measurement[], key: keyof Measurement): number => {
  if (data.length === 0) return 0;

  const sortedData = sortBy(data, key);
  const half = floor(sortedData.length / 2);
  const isEven = sortedData.length % 2 === 0;
  if (isEven) {
    return (sortedData[half - 1][key] + sortedData[half][key]) / 2;
  }
  return sortedData[half][key];
};

/**
 * @param data
 * @param key
 */
const getMean = (data: Measurement[], key: string): number => meanBy<Measurement>(data, key);

/**
 * @param data
 * @param key
 */
const getMin = (data: Measurement[], key: keyof Measurement): number => {
  const min = minBy<Measurement>(data, key);
  if (min) return min[key];
  return NaN;
};

/**
 * @param data
 * @param key
 */
const getMax = (data: Measurement[], key: keyof Measurement): number => {
  const max = maxBy<Measurement>(data, key);
  if (max) return max[key];
  return NaN;
};

/**
 * @param data
 * @param key
 */
const getPropertyStats = (data: Measurement[], key: keyof Measurement = "price") => ({
  median: getMedian(data, key),
  mean: getMean(data, key),
  min: getMin(data, key),
  max: getMax(data, key),
});

/**
 * Return stats data for data parser
 *
 * @param data
 */
const getStats = (data: Measurement[]): Stats => {
  const { median: medianPrice, mean: meanPrice, min: minPrice, max: maxPrice } = getPropertyStats(
    data
  );
  const { median: medianM2, mean: meanM2, min: minM2, max: maxM2 } = getPropertyStats(data, "m2");
  const {
    median: medianPriceM2,
    mean: meanPriceM2,
    min: minPriceM2,
    max: maxPriceM2,
  } = getPropertyStats(data, "priceM2");

  return {
    items: data.length,
    medianPrice,
    meanPrice,
    minPrice,
    maxPrice,
    medianM2,
    meanM2,
    minM2,
    maxM2,
    medianPriceM2,
    meanPriceM2,
    minPriceM2,
    maxPriceM2,
  };
};

/**
 * Prepare data for db
 *
 * @param data
 * @param type
 * @param location
 */
export const parseData = (data: Parse, type: string, location: string): Entry => ({
  ...getStats(calculatePriceM2(data.scraped)),
  type,
  location,
  subLocation: data.name,
});
