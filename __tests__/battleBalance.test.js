const avatarProfiles = require('./heroProfiles.json');
const { selectFoeTemplate, generateFoeStats } = require('../game/foeFunctions');


// Use toEqual for objects and arrays
// Use toBe for scalar (primitive) data types only. 
// check the response data type use typeof operator

describe('Test Balance of various avatars against a series of enemies', ()=>{
  // FIRST TEST, YEAH!
  it('Should Load profiles', ()=>{
    // make sure there is a profiles array
    expect(Array.isArray(avatarProfiles)).toBe(true);
    // Make Sure there are more than zero profiles
    expect(avatarProfiles.length).toBeGreaterThan(0);
    // Make Sure all profiles have the right properties
    expect(avatarProfiles).toEqual(
      expect.arrayContaining([ 
        expect.objectContaining({
          "activityXP": expect.any(Number),
          "battleXP": expect.any(Number),
          "air": expect.any(Number),
          "earth": expect.any(Number),
          "fire": expect.any(Number),
          "water": expect.any(Number),
          "power": expect.any(Number),
          "health": expect.any(Number),
          "armor": expect.any(Number),
          "recovery": expect.any(Number),
          "character": expect.any(String),
          "equipped": expect.any(Array),
          "name": expect.any(String),
          "description": expect.any(String),
          "level": expect.any(Number),           
        })
      ])
    )
  });

  it('Should Create a foe from the first avatar', ()=>{
    const firstAv = avatarProfiles[0];
    console.log('FA-',firstAv);
    const foeTemplate = selectFoeTemplate(firstAv.level);
    console.log('FFT-',foeTemplate);
    // MATCH PARTIAL, GOD WTF WHY WAS THIS SUCH A PAIN IN THE ASS
    expect(foeTemplate).toEqual(
      expect.objectContaining(
        {
          ability : expect.any(Object),
          foe : expect.any(Array),
          id : expect.any(Number),
          pba : expect.any(Array),
          reward : expect.any(Object),
          type : expect.any(String)
        }
      )
    )

    const foe = {
      id : foeTemplate.id,
      type : foeTemplate.type,
      name : foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)],
      ability : foeTemplate.ability,
      class : foeTemplate.class
    }
    const foeWithStats = Object.assign({}, foe, generateFoeStats(firstAv, foe));

    expect(foeWithStats).toMatchObject({
      id: expect.any(Number),
      type: expect.any(String),
      name: expect.any(String),
      ability: expect.objectContaining({
        effect: expect.any(String),
        name: expect.any(String),
        type: expect.any(String)
      }),
      class: expect.any(String),
      health: expect.any(Number),
      power: expect.any(Number),
      armor: expect.any(Number),
      fire: expect.any(Number),
      earth: expect.any(Number),
      water: expect.any(Number),
      air: expect.any(Number),
      difficulty: expect.any(Number)
    });


  });


});
