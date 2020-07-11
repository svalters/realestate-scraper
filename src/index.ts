import mongoose from "mongoose";
import { map, flatMap } from "rxjs/operators";
import { from } from "rxjs";

import Model from "./model";
import { MONGODB_URI } from "./constants";
import { getEntryLinks, scrape } from "./scrape";
import { logger, getRootLinks, parseData } from "./utils";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger("STARTED!"))
  .then(() =>
    from(getRootLinks()).pipe(
      flatMap(getEntryLinks),
      flatMap(({ region, type, links }) =>
        from(links).pipe(
          flatMap((link) => scrape(link)),
          map((entry) => parseData(entry, type.name, region.name)),
          flatMap((entry) => new Model(entry).save())
        )
      )
    )
  )
  .then((scraperObserver) =>
    scraperObserver.subscribe(
      (document) => logger(document.toString()),
      (err) => logger(err, "Error"),
      () => {
        logger("FINISHED!");
        mongoose.connection.close();
      }
    )
  );
