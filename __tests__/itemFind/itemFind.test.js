const chance = require('chance')();
const { ELM_LEVEL_3_REQ } = require('../../game/CONSTANTS');
const { _elmLvl3Items, _callXTimes } = require('../../game/activityItemFind');

it('Should return an array of items awarded or null if none were awarded', () =>{
  const NUMBER_OF_RUNS = 20;
  const testRuns = []
  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    const randomLevel = chance.integer({ min : 1, max : 100 });
    const result = _elmLvl3Items(randomLevel);
    //console.log(result);
    testRuns.push(expect(result).nullOrAny(String));
  }
  return Promise.all(testRuns);
});


it('PARTIAL HOUR = Should return an array of items awarded or null if none were awarded', () =>{
  const NUMBER_OF_RUNS = 20;
  const testRuns = []
  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    const randomLevel = chance.integer({ min : 1, max : 100 });
    // 10% chance for a full hour of getting a lvl 3 item. This const below represents a percent from a partial hour
    const randomPartialPercent = 7;
    const result = _elmLvl3Items(randomLevel, randomPartialPercent);
    //console.log('partial', result);
    testRuns.push(expect(result).nullOrAny(String));
  }
  return Promise.all(testRuns);
});







it('Should run _callXTimes 3 times, with the third time with an optional param and return either null or an array of items randomly found', ()=>{
  const xpGain = 125;
  const activityItemSessions = xpGain / 60;
  const NUMBER_OF_RUNS = 20;
  const testRuns = [];

  for (let index = 0; index < NUMBER_OF_RUNS; index++) {
    const randomLevel = chance.integer({ min : 1, max : 100 });
    
    const func = (remainder) =>{
      return remainder ? _elmLvl3Items(randomLevel, remainder) : _elmLvl3Items(randomLevel);
    }

    const result = _callXTimes(func, activityItemSessions);
    console.log(result);
    testRuns.push(expect(result).nullOrAny(Array));

  }
  return Promise.all(testRuns);


});