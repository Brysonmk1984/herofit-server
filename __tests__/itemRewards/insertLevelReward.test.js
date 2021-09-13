const { loadDb, closeDb } = require('../setup/databaseForTests.setup.js');
const { activityLevelRewards, activityStatRewards, determineStatImprovements } = require('../../game/activities/activityRewards');
const { range } = require('../../lib/helperFunctions');
const preventDuplicateItems = require('../../game/items/preventDuplicateItems');

beforeAll(async () => {
  await loadDb();
});


// it('Should Insert the 2 items earned from reaching level 100', () => {
//   const levelsToCheck = range(99,101);
//   return activityLevelRewards(254, levelsToCheck)
//   .then((data) =>{
//     expect(data).toBeArrayOfSize(2);
//     expect(data[0].name).toBe('Ascended Self');
//     expect(data[1].name).toBe('Ascended');
//   }).catch((error)=>{
//     console.log('parent catch',error);
//   });
// });


// it('Should Insert Fire Skin for Grabbler', () => {
//   statObj = {
//     // pt. values earned
//     fire : [499,500],
//     earth : [],
//     water : [],
//     air : [200]
//   }
    
//   return activityStatRewards(254, statObj)
//   .then((data) =>{
//     console.log('returned data', data);
//     expect(data).toBeArrayOfSize(1);

//   }).catch((error)=>{
//     console.log('parent catch',error);
//   });
// });

// it('Should Insert Fire Skin for Grabbler', () => {
//   const improvements = {
//     power: 10,
//     'max health': 10,
//     health: 0,
//     air: 8,
//     water: 0,
//     fire: 6,
//     earth: 6,
//     aether: 0,
//     'Photon Tokens': 69
//   };
//   const avStatSnapshot = {
//     id: 254,
//     owner: 'bryson.kruk@protonmail.com',
//     power: 520,
//     health: 385,
//     character: 'Boulder Bro',
//     name: 'Grabbler',
//     hasBeenUpgraded: true,
//     fire: 164.6,
//     earth: 469.55,
//     water: 50,
//     air: 219.82,
//     armor: 50,
//     recovery: 50,
//     activityXP: 24419,
//     qp: 160,
//     battleXP: 4318,
//     qpFire: 23,
//     qpEarth: 0,
//     qpWater: 50,
//     qpAir: 2,
//     qpRecovery: 45,
//     qpArmor: 50,
//     qpPower: 25,
//     isFake: null,
//     maxHealth: 545,
//     qpHealth: 50,
//     status: 'Rested',
//     goToBattle: true,
//     battleWins: 109,
//     battleLosses: 38,
//     battleDraws: 1,
//     battleDkos: 12,
//     userId: 288,
//     photonTokens: 2303,
//     statusFade: 0,
//     aether: 0,
//     qpAether: 0,
//     restedEnough: false,
//     level: 80,
//     albedo: undefined,
//     nextLevelStartXp: 29164,
//     thisLevelStartXp: 28658,
//     healthRegenRate: 24
//   };
//   const statObj = determineStatImprovements(improvements, avStatSnapshot)
  
//   console.log('THESTATONK', statObj);
//   expect(true);
// });

it('Should return a false value for red belt, and a true value for black belt', () =>{
  const items = ['Red Belt', 'Black Belt', 'Health Potion'];
  return preventDuplicateItems(items, 254)
  .then((data) =>{
    console.log('DATA', data);
    // Already have a red belt, so it should return true, indicating we already have it
    expect(data[0]).toBe(true);
    // Don't have Black belt yet, so it should return false
    expect(data[1]).toBe(false);
    // Health Potion is exhaustible, so it should return false, meaning it is not a duplicate item (even if there are more than 1)
    expect(data[2]).toBe(false);
  })

});



afterAll(async () => {
  await closeDb();
});