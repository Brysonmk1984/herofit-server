import sequelize, { Op } from "sequelize";
import { loadDb } from "../setup/databaseForTests.setup";
import { activityLevelRewards, activityStatRewards, determineStatImprovements } from "../../src/game/activities/activityRewards";
import { range } from "../../src/lib/helperFunctions";
import preventDuplicateItems from "../../src/game/items/preventDuplicateItems";

const db = loadDb();
const { AvatarItems } = db.models;

describe("Insert Level Reward Tests", () => {
  it("Should Insert the 2 items earned from reaching level 100", async () => {
    const levelsToCheck = range(99, 101);
    const data = await activityLevelRewards(254, levelsToCheck);

    const itemsNamesAwarded = [data[0].name, data[1].name];
    expect(data).toBeArrayOfSize(2);

    expect(itemsNamesAwarded).toEqual(expect.arrayContaining(["Ascended", "Ascended Self"]));
    expect(levelsToCheck).toEqual(expect.any(Array));
  });

  it("Should Insert Fire Skin for Grabbler", async () => {
    const statObj = {
      // pt. values earned
      fire: [499, 500],
      earth: [],
      water: [],
      air: [200],
    };
    const data = await activityStatRewards(254, statObj);
    console.log("feet", data);
    expect(data.length).toEqual(1);
  });

  it("Should return only 'Black Belt' and 'Health Potion'", async () => {
    const items = ["Red Belt", "Black Belt", "Health Potion"];
    // preventDuplicateItems returns a filtered list of the items that are added. In this case, red belt isn't included, but blackbelt and healthpotion are
    const data = await preventDuplicateItems(items, 254);

    // Don't have Black belt yet, so it should return false
    expect(data[0]).toBe("Black Belt");
    // Health Potion is exhaustible, so it should return false, meaning it is not a duplicate item (even if there are more than 1)
    expect(data[1]).toBe("Health Potion");
  });
});

afterAll(async () => {
  // Remove added items
  await AvatarItems.destroy({ where: { itemID: { [Op.in]: [98, 96, 95] }, avatarID: 254 } });

  // closeDB
  await db.close();
});
