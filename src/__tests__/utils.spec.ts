import { getPrice, getM2, getMedian, withPriceM2 } from "../utils"

const SCRAPED_DATA_SET = [
  { price: 2100000, m2: 908 },
  { price: 175000, m2: 150 },
  { price: 158000, m2: 90 },
  { price: 450000, m2: 867 },
  { price: 3000000, m2: 2697 },
  { price: 3000000, m2: 4661 },
  { price: 2500000, m2: 6068 },
  { price: 1200000, m2: 1090 },
  { price: 925000, m2: 1349 },
  { price: 139000, m2: 118 },
  { price: 195000, m2: 300 },
]

describe("get price", () => {
  test("it should return number", () => {
    const testCases = [
      { input: "2,100,000  €", output: 2100000 },
      { input: "15,000  €", output: 15000 },
      { input: "999  €", output: 999 },
      { input: "0  €", output: 0 },
      { input: "15,000  €/mon.", output: 0 },
      { input: "190  €/day.", output: 0 },
      { input: " - ", output: 0 },
      { input: "buy", output: 0 },
      { input: "Renting", output: 0 },
    ]

    testCases.forEach(({ input, output }) => {
      expect(getPrice(input)).toEqual(output)
    })
  })
})

describe("get m2", () => {
  test("it should return number", () => {
    const testCases = [
      { input: "1828.00 m²", output: 1828 },
      { input: "350", output: 350 },
      { input: "0.30 ha.", output: 3000 },
      { input: "5 ha.", output: 50000 },
      { input: " - ", output: 0 },
    ]

    testCases.forEach(({ input, output }) => {
      expect(getM2(input)).toEqual(output)
    })
  })
})

describe("get median", () => {
  test("it should return number", () => {
    const testCases = [
      {
        input: withPriceM2([{ price: 2100000, m2: 908 }]),
        output: { price: 2100000, m2: 908, priceM2: 2312.775330396476 },
      },
      {
        input: withPriceM2([
          { price: 2100000, m2: 908 },
          { price: 100000, m2: 89 },
        ]),
        output: { price: 1100000, m2: 498.5, priceM2: 1718.1854180072269 },
      },
      {
        input: withPriceM2([
          { price: 2100000, m2: 908 },
          { price: 100000, m2: 89 },
          { price: 70000, m2: 62 },
          { price: 64000, m2: 58 },
        ]),
        output: { price: 85000, m2: 75.5, priceM2: 1126.3138818412467 },
      },
      {
        input: withPriceM2(SCRAPED_DATA_SET),
        output: { price: 925000, m2: 908, priceM2: 1100.9174311926606 },
      },
    ]

    testCases.forEach(({ input, output }) => {
      expect(getMedian(input, "price")).toEqual(output.price)
      expect(getMedian(input, "m2")).toEqual(output.m2)
      expect(getMedian(input, "priceM2")).toEqual(output.priceM2)
    })
  })
})
