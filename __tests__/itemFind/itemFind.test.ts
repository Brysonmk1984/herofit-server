require("dotenv").config();
import { loadDb } from "../setup/databaseForTests.setup";
import Chance from "chance";
import { _callXTimes, _itemFind, _chancePTFind, activityItemFind } from "../../src/game/activities/activityItemFind";
import mockItemDrops from "./mockItemDrops.json";

const chance = Chance();
const db = loadDb();

let weightedElms;

beforeAll(() => {
  const improvements = { air: 0, water: 0, fire: 0.2, earth: 0.8 };
  const totalElmImprove = improvements.air + improvements.water + improvements.fire + improvements.earth;
  weightedElms = {
    air: (improvements.air / totalElmImprove) * 100,
    water: (improvements.water / totalElmImprove) * 100,
    fire: (improvements.fire / totalElmImprove) * 100,
    earth: (improvements.earth / totalElmImprove) * 100,
  };
});

it("Should call _chancePTFind, which will return either null or the amount found in PT", () => {
  const NUMBER_OF_RUNS = 10;
  const testRuns = [];

  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    // test both receiving PT and not receiving
    if (index % 2 === 0) {
      const result = _chancePTFind(null, 100, 100);
      testRuns.push(expect(result).toEqual(expect.any(Number)));
    } else {
      const result = _chancePTFind(null, 0, 100);
      testRuns.push(expect(result).toBe(null));
    }
  }
  return Promise.all(testRuns);
});

it("Should run _callXTimes 3 times, with the third time with an optional param and return either null or an array of items randomly found", () => {
  const xpGain = 96;
  const activityItemSessions = xpGain / 60;
  const integer = Math.floor(activityItemSessions);
  const remainder = activityItemSessions % 1;
  const remainderPercent = remainder * 100;
  const NUMBER_OF_RUNS = 1;
  const testRuns = [];

  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    const randomLevel = chance.integer({ min: 1, max: 100 });
    const func = () => {
      return _itemFind(randomLevel, remainderPercent, weightedElms, null, null, []);
    };
    const result = _callXTimes(func, integer, remainderPercent, randomLevel, weightedElms, undefined, undefined, []);

    testRuns.push(
      expect(result).toEqual(
        expect.objectContaining({
          items: expect.nullOrAny(Array),
          pt: expect.nullOrAny(Number),
        }),
      ),
    );
  }

  return Promise.all(testRuns);
});

it("Should Run Whole Item find sequence, starting with activityItemFind, an object with ptgained and items found (or null for each) will be returned", () => {
  const xpGain = 62;
  const NUMBER_OF_RUNS = 1;
  const testRuns = [];

  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    const randomLevel = chance.integer({ min: 1, max: 100 });
    // the last param is an array of possible items drops
    // the second to Last two params are itemFind and ptFind stats (percentages that boost base of each)
    const result = activityItemFind(xpGain, randomLevel, weightedElms, null, null, mockItemDrops);
    console.log("item and pt find result = ", result);
    testRuns.push(
      expect(result).toEqual(
        expect.objectContaining({
          items: expect.nullOrAny(Array),
          pt: expect.nullOrAny(Number),
        }),
      ),
    );
  }

  return Promise.all(testRuns);
});

afterAll(async () => {
  // closeDB
  await db.close();
});
