import mongoose from "mongoose"
import { flatten } from "lodash"

import { MONGODB_URI } from "./constants"
import { getCandidates, scrape, insertEntries } from "./scrape"

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => Promise.all(getCandidates()))
  .then(candidates => Promise.all(scrape(candidates)))
  .then(entries => flatten(entries))
  .then(entries => Promise.all(insertEntries(entries)))
  .finally(() => mongoose.connection.close())
