import cheerio from "cheerio"
import { camelCase } from "lodash"
import axiosRetry from "axios-retry"
import axios from "axios"

import Model from "./model"
import { SELECTORS, SITE_URL } from "./constants"
import {
  parseData,
  getSellUrl,
  getSiteUrl,
  getM2,
  getPrice,
  normalizeText,
  getRootLinks,
} from "./utils"
import { Link, Candidate, Scraped, Entry, Parse } from "./types"

// Bind axios retry to axios
axiosRetry(axios, {
  retries: 20,
  retryDelay: retryCount => retryCount * 10000,
})

/**
 * Load axios response to cheerio
 */
const loadCheerio = (url: string) =>
  axios.get(url).then(response => cheerio.load(response.data))

/**
 * Parse category pages for links
 */
const getOptionLinks = (page: cheerio.Root): Link[] =>
  page(SELECTORS.category)
    .toArray()
    .map((type: cheerio.Element) => {
      const linkStatic = page(type)
      return {
        url: linkStatic.attr("href") || "",
        name: linkStatic.text(),
      }
    })
    .filter(
      ({ url }) => url && !url.includes("/all/") && !url.includes("/other/")
    )

/**
 * Return scraping link list
 */
export const getCandidates = (): Promise<Candidate>[] =>
  getRootLinks().map(({ region, type }) =>
    loadCheerio(region.url)
      .then(getOptionLinks)
      .then(subRegions => ({
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
  )

/**
 * Return table header entry list
 */
const getListHeaders = (page: cheerio.Root) =>
  page(`${SELECTORS.realEstateListPage.table} tr:first-child td`)
    .toArray()
    .map((cell, i) => (i === 0 ? "title" : camelCase(page(cell).text())))

/**
 * Return next page url
 */
const nextPageUrl = (page: cheerio.Root) => {
  const nextEl = page(SELECTORS.next)
  const href = nextEl?.attr("href") || ""
  if (href.includes(".html")) {
    return getSiteUrl(href)
  }
}

/**
 * Return page table data
 */
const scrapePage = (page: cheerio.Root, headers: string[]): Scraped[] => {
  const rowNodeList = page(
    `${SELECTORS.realEstateListPage.table} tr:not(:first-child):not(:last-child)`
  )

  const scrapedData: Scraped[] = []
  rowNodeList.each((_, row: any) => {
    const cells: cheerio.Element[] = row.childNodes
    let rowData = {
      price: 0,
      m2: 0,
    }

    cells.forEach((cell, i) => {
      const headerIndex =
        headers.length - cells.length + i >= 0
          ? headers.length - cells.length + i
          : 0

      switch (headers[headerIndex]) {
        case "price": {
          const cellText = page(cell).text() || ""
          rowData.price = getPrice(cellText)
          break
        }
        case "m2": {
          const cellText = page(cell).text() || ""
          rowData.m2 = getM2(cellText)
          break
        }
        default:
          break
      }

      if (rowData.price && rowData.m2) {
        scrapedData.push(rowData)
      }
    })
  })
  return scrapedData
}

/**
 * Scrape all paginated pages
 */
const scrapePages = async (
  page: cheerio.Root,
  headers: string[],
  data: Scraped[] = []
): Promise<Scraped[]> => {
  const pageData = scrapePage(page, headers)

  // Parse next page if exists
  const next = nextPageUrl(page)
  if (next) {
    return loadCheerio(next).then(page =>
      scrapePages(page, headers, data.concat(pageData))
    )
  }
  return data.concat(pageData)
}

/**
 * Return parsed data for scraped link
 */
export const scrapeLink = (link: Link): Promise<Parse> =>
  loadCheerio(getSellUrl(link.url)).then(page => {
    // Get page headers list
    const headers = getListHeaders(page)
    if (headers.length === 0) {
      return {
        name: link.name,
        scraped: [],
      }
    }

    // Return scraped data
    return scrapePages(page, headers).then(scraped => ({
      name: normalizeText(link.name),
      scraped,
    }))
  })

/**
 * scrape all by type, region and sub region
 */
export const scrape = (candidates: Candidate[]): Promise<Entry[]>[] =>
  candidates.map(({ region, type, links }) =>
    Promise.all(links.map(scrapeLink))
      .then(data => data.filter(item => item.scraped.length !== 0))
      .then(data => data.map(entry => parseData(entry, type.name, region.name)))
  )

/**
 * Insert scraped data in database
 */
export const insertEntries = (entries: Entry[]) =>
  entries.map(data => new Model(data).save())
