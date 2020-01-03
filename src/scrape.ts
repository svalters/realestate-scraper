import cheerio from "cheerio";
import { camelCase, flatten } from "lodash";
import axiosRetry from "axios-retry";
import axios from "axios";
import Model from "./model";
import { SELECTORS } from "./constants";
import { parseData, getEntryLinks, getSellUrl, getSiteUrl, logger, getM2, getPrice } from "./utils";
import { Link, Candidate, Scraped, Entry } from "./types";

// Bind axios retry to axios
axiosRetry(axios, {
  retries: 20,
  retryDelay: retryCount => retryCount * 10000
});

/**
 * Load axios response to cheerio
 *
 * @param url
 */
const loadCheerioStatic = async (url: string): Promise<CheerioStatic> =>
  axios.get(url).then(response => cheerio.load(response.data));

/**
 * Return next page url
 *
 * @param page
 */
const nextPageUrl = (page: CheerioStatic): string => {
  const nextEl = page(SELECTORS.next);
  const href = (nextEl && nextEl.attr("href")) || "";
  if (href.includes(".html")) return getSiteUrl(href);
  return "";
};

/**
 * Parse category pages for links
 *
 * @param page
 */
const getOptionLinks = (page: CheerioStatic): Link[] => {
  return page(SELECTORS.category)
    .toArray()
    .map((type: CheerioElement) => {
      const linkStatic = page(type);
      return {
        url: linkStatic.attr("href") || "",
        name: linkStatic.text()
      };
    })
    .filter(({ url }) => url && !url.includes("/all/"));
};

/**
 * Return header entry list
 *
 * @param page
 */
const getListHeaders = (page: CheerioStatic): string[] => {
  const headerCells = page(`${SELECTORS.realEstateListPage.table} tr:first-child td`);
  return headerCells.toArray().map((cell, i) => (i === 0 ? "title" : camelCase(page(cell).text())));
};

/**
 * Return page table data
 *
 * @param page
 * @param headers
 */
const scrapePage = (page: CheerioStatic, headers: string[]): Scraped[] => {
  const rowNodeList = page(
    `${SELECTORS.realEstateListPage.table} tr:not(:first-child):not(:last-child)`
  );

  const scrapedData: Scraped[] = [];
  rowNodeList.each((_, row) => {
    const cells = row.childNodes;
    let rowData = {
      price: 0,
      m2: 0
    };

    cells.forEach((cell, i: number) => {
      const headerIndex =
        headers.length - cells.length + i >= 0 ? headers.length - cells.length + i : 0;

      switch (headers[headerIndex]) {
        case "price": {
          const cellText = page(cell).text() || "";
          rowData.price = getPrice(cellText);
          break;
        }
        case "m2": {
          const cellText = page(cell).text() || "";
          rowData.m2 = getM2(cellText);
          break;
        }
        default:
          break;
      }

      if (rowData.price && rowData.m2) {
        scrapedData.push(rowData);
      }
    });
  });
  return scrapedData;
};

/**
 * Scrape all paginated pages
 *
 * @param page
 * @param headers
 * @param data
 */
const scrapePages = async (
  page: CheerioStatic,
  headers: string[],
  data: Scraped[] = []
): Promise<Scraped[]> => {
  const pageData = scrapePage(page, headers);

  // Parse next page if exists
  const next = nextPageUrl(page);
  if (next) {
    return loadCheerioStatic(next).then(page => scrapePages(page, headers, data.concat(pageData)));
  }
  return data.concat(pageData);
};

/**
 * Return scraping link list
 */
export const getCandidates = (): Promise<Candidate>[] =>
  getEntryLinks().map(async ({ region, type }) =>
    loadCheerioStatic(region.url)
      .then(cheerioStatic => getOptionLinks(cheerioStatic))
      .then(subRegions => ({
        region,
        type,
        links: subRegions.length !== 0 ? subRegions : [region]
      }))
  );

/**
 * scrape all by type, region and sub region
 *
 * @param candidates
 */
export const scrape = (candidates: Candidate[]): Promise<Entry>[] =>
  candidates.map(async ({ region, type, links }) => {
    return Promise.all(
      links.map(async link => {
        logger(getSellUrl(link.url), "LINK");
        return loadCheerioStatic(getSellUrl(link.url)).then(page => {
          // Get page headers list
          const headers = getListHeaders(page);
          if (headers.length === 0) {
            return [];
          }

          // Return scraped data
          return scrapePages(page, headers);
        });
      })
    ).then((data: Scraped[][]) => parseData(flatten(data), type.name, region.name));
  });

/**
 * Insert scraped data in database
 *
 * @param entries
 */
export const insertEntries = (entries: Entry[]): Promise<void>[] =>
  entries.map(data => new Model(data).save().then(document => logger(document.toString())));
