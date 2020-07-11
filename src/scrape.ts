import cheerio from "cheerio";
import { camelCase } from "lodash";
import axiosRetry from "axios-retry";
import axios from "axios";
import { map, filter, flatMap } from "rxjs/operators";
import { from } from "rxjs";
import { SELECTORS, SITE_URL } from "./constants";
import { getSellUrl, getSiteUrl, getM2, getPrice, normalizeText } from "./utils";
import { Link, Candidate, Scraped } from "./types";

// Bind axios retry to axios
axiosRetry(axios, {
  retries: 20,
  retryDelay: (retryCount) => retryCount * 10000,
});

/**
 * Load axios response to cheerio
 *
 * @param url
 */
const loadCheerio = (url: string): Promise<CheerioStatic> =>
  axios.get(url).then((response) => cheerio.load(response.data));

/**
 * Return next page url
 *
 * @param page
 */
const nextPageUrl = (page: CheerioStatic): string | null => {
  const nextEl = page(SELECTORS.next);
  const href = (nextEl && nextEl.attr("href")) || "";
  if (href.includes(".html")) return getSiteUrl(href);
  return null;
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
        name: linkStatic.text(),
      };
    })
    .filter(({ url }) => url && !url.includes("/all/") && !url.includes("/other/"));
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
  const rowNodeList = page(`${SELECTORS.realEstateListPage.table} tr:not(:first-child)`);

  const scrapedData: Scraped[] = [];
  rowNodeList.each((_, row) => {
    const cells = row.childNodes;
    let rowData = {
      price: 0,
      m2: 0,
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
 * Return scraping link list
 *
 * @param candidate
 */
export const getEntryLinks = ({ region, type }: Omit<Candidate, "links">) =>
  from(loadCheerio(region.url)).pipe(
    map((page) => getOptionLinks(page)),
    map((subRegions) => ({
      region,
      type,
      links:
        subRegions.length !== 0
          ? subRegions
          : [
              {
                ...region,
                url: region.url.replace(SITE_URL, ""),
              },
            ],
    }))
  );

/**
 * Scrape paginated pages recursively
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
    return loadCheerio(next).then((page) => scrapePages(page, headers, data.concat(pageData)));
  }
  return data.concat(pageData);
};

/**
 * Start page scraper
 *
 * @param link
 */
export const scrape = ({ url, name }: Link) =>
  from(loadCheerio(getSellUrl(url))).pipe(
    map((page) => ({ page, headers: getListHeaders(page), name: normalizeText(name) })),
    filter(({ headers }) => headers.length !== 0),
    flatMap(({ page, headers }) =>
      from(scrapePages(page, headers)).pipe(
        filter((scraped) => scraped.length !== 0),
        map((scraped) => ({ name, scraped }))
      )
    )
  );
