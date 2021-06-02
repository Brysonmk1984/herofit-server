const chance = require('chance')();
const { _elmLvl3Items, _callXTimes, _itemFind, _ptFind, activityItemFind } = require('../../game/activityItemFind');

let weightedElms;
beforeAll(() =>{
  const improvements = { air : 0, water : 0, fire : .2, earth : .8 };
  const totalElmImprove = improvements.air + improvements.water + improvements.fire + improvements.earth;
  weightedElms = {
    air : (improvements.air / totalElmImprove) * 100,
    water : (improvements.water / totalElmImprove) * 100,
    fire : (improvements.fire / totalElmImprove) * 100,
    earth : (improvements.earth / totalElmImprove) * 100,
  }
});

// it('Should return an array of items awarded or null if none were awarded', () =>{
//   const NUMBER_OF_RUNS = 20;
//   const testRuns = []
//   for (let index = 0; index < NUMBER_OF_RUNS; index++) {
//     const randomLevel = chance.integer({ min : 1, max : 100 });
//     const result = _elmLvl3Items(randomLevel, undefined, weightedElms);
//     //console.log(result);
//     testRuns.push(expect(result).nullOrAny(String));
//   }
//   return Promise.all(testRuns);
// });


// it('PARTIAL HOUR = Should return an array of items awarded or null if none were awarded', () =>{
//   const NUMBER_OF_RUNS = 20;
//   const testRuns = [];
//   for (let index = 0; index < NUMBER_OF_RUNS; index++) {
//     const randomLevel = chance.integer({ min : 1, max : 100 });
//     // 10% chance for a full hour of getting a lvl 3 item. This const below represents a percent from a partial hour
//     const randomPartialPercent = 7;
//     const result = _elmLvl3Items(randomLevel, randomPartialPercent, weightedElms);
//     //console.log('partial', result);
//     testRuns.push(expect(result).nullOrAny(String));
//   }
//   return Promise.all(testRuns);
// });


// it('Should call _ptFind, which will return either null or the amount found in PT', ()=>{
//   const NUMBER_OF_RUNS = 1;
//   const testRuns = [];

//   for (let index = 0; index < NUMBER_OF_RUNS; index++) {
//     const xpGain = 119;
//     const activityItemSessions = xpGain / 60;
//     const remainder =  activityItemSessions % 1;
//     const remainderPercent = remainder * 100;

//     const result = _ptFind(null, remainderPercent);
//     //console.log(result);
//     testRuns.push(expect(result).nullOrAny(Number));

//   }
//   return Promise.all(testRuns);
  
// });


// it('Should run _callXTimes 3 times, with the third time with an optional param and return either null or an array of items randomly found', ()=>{
//   const xpGain = 96;
//   const activityItemSessions = xpGain / 60;
//   const NUMBER_OF_RUNS = 1;
//   const testRuns = [];

//   for (let index = 0; index < NUMBER_OF_RUNS; index++) {
//     const randomLevel = chance.integer({ min : 1, max : 100 });
//     const func = (activityItemSessions) =>{
//       return _itemFind(randomLevel, activityItemSessions, weightedElms);
//     }
//     const result = _callXTimes(func, activityItemSessions);

//     testRuns.push(
//       expect(result).toEqual(expect.objectContaining({
//         items : expect.nullOrAny(Array),
//         pt : expect.nullOrAny(Number)
//       }))
//     );
//   }

//   return Promise.all(testRuns);
// });


it('Should Run Whole Item find sequence, starting with activityItemFind, an object with ptgained and items found (or null for each) will be returned', ()=>{
  const xpGain = 62;
  const NUMBER_OF_RUNS = 1;
  const testRuns = [];

  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    const randomLevel = chance.integer({ min : 1, max : 100 });
    const result = activityItemFind(xpGain, randomLevel, weightedElms);
    console.log('RES', result);
    testRuns.push(
      expect(result).toEqual(expect.objectContaining({
        items : expect.nullOrAny(Array),
        pt : expect.nullOrAny(Number)
      }))
    );
  }

  return Promise.all(testRuns);
});


