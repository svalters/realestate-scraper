import mongoose from "mongoose";

const entry = new mongoose.Schema(
  {
    medianPrice: { type: Number, required: true },
    meanPrice: { type: Number, required: true },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true },

    medianM2: { type: Number, required: false },
    meanM2: { type: Number, required: false },
    minM2: { type: Number, required: false },
    maxM2: { type: Number, required: false },

    medianPriceM2: { type: Number, required: false },
    meanPriceM2: { type: Number, required: false },
    minPriceM2: { type: Number, required: false },
    maxPriceM2: { type: Number, required: false },

    items: { type: Number, required: true },
    type: { type: String, required: true },
    location: { type: String, required: true },
    subLocation: { type: String, required: true },
  },
  {
    timestamps: {
      currentTime: () => new Date().setMinutes(0, 0, 0),
      updatedAt: false,
    } as any,
  }
);

export default mongoose.model("Entry", entry);
