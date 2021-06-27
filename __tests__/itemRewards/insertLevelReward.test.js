const { loadDb, closeDb } = require('../databaseForTests.setup.js');
const activityRewards = require('../../game/activities/activityRewards');
const { range } = require('../../lib/helperFunctions');


beforeAll(async () => {
  await loadDb();
});


it('Should Insert the 2 items earned from reaching level 100', () => {
  const levelsToCheck = range(99,101);
  return activityRewards(254, levelsToCheck)
  .then((data) =>{
    expect(data).toBeArrayOfSize(2);
    expect(data[0].name).toBe('Ascended Self');
    expect(data[1].name).toBe('Ascended');
  }).catch((error)=>{
    console.log('parent catch',error);
  });
});


afterAll(async () => {
  await closeDb();
});