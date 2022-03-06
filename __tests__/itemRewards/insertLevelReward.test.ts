import { Op } from "sequelize";
import { loadDb, closeDb } from "../setup/databaseForTests.setup.js";
import { activityLevelRewards, activityStatRewards, determineStatImprovements } from "../../src/game/activities/activityRewards";
import { range } from "../../src/lib/helperFunctions";
import preventDuplicateItems from "../../src/game/items/preventDuplicateItems";
import { AvatarItems } from "../../src/config/db";

it("works?", () => {
  expect(true).toBeTruthy();
});
