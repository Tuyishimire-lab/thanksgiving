import { groupA } from "./plans/groupA.js";
import { groupB } from "./plans/groupB.js";
import { groupC } from "./plans/groupC.js";

// Devotional registry combining all 51 plans across 17 categories
export const devotionals = {
  ...groupA,
  ...groupB,
  ...groupC,
};
