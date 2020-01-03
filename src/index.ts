import mongoose from "mongoose";
import { MONGODB_URI } from "./constants";
import { getCandidates, scrape, insertEntries } from "./scrape";
import { logger } from "./utils";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => logger("STARTED!"))
  .then(() => Promise.all(getCandidates()))
  .then(candidates => Promise.all(scrape(candidates)))
  .then(entries => Promise.all(insertEntries(entries)))
  .then(() => logger("FINISHED!"))
  .finally(() => mongoose.connection.close());
