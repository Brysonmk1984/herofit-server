const { FOE_MOD } = require('./constants'); 
const villains = require('./villains.json');

function selectFoeTemplate(level){
  // 1 in 100 chance of fighting Titan
  // Must be level 10
  // const randomNum = Math.floor(Math.random() * 100);
  // if(randomNum === 0 && level >= 10){
  //   return villains.Titans[Math.floor(Math.random() * villains.Titans.length)];
  // }
  let villain;

  // Must be at least level 5 to have a shot at getting matched against shadow self
  if(level >= 5){console.log('FT CASE 1');
    // 1 in 15 will face Shadow-Self
    const randomNum = Math.floor(Math.random() * 18);
    
    if(randomNum === 0){console.log('FT CASE 1A');
      villain = villains.Spirits[villains.Spirits.length -1];
    }else{console.log('FT CASE 1B');
      // Otherwise, they'll face another random spirit
      // Math.floor ensures the last array item will never be picked, it gets rounded down.
      villain = villains.Spirits[Math.floor(Math.random() * (villains.Spirits.length -1))];
    }
  }else{console.log('FT CASE 2');
    villain = villains.Spirits[Math.floor(Math.random() * (villains.Spirits.length -1))];
  }
  return villain;
}

function generateFoeStats(avatar, foe){

  // If it's the shadow boss, just return a mirror image of the avatar
  if(foe.type === 'Shadow-Self'){
    return {
      health : avatar.health,
      power : avatar.power,
      armor : avatar.armor,
      fire : avatar.fire,
      earth : avatar.earth,
      water : avatar.water,
      air : avatar.air
    };
  }

  // Otherwise, build foe as usual
  // GIVES CURRENT LEVEL based on XP input
  function currentLevel(xp){
    const exponent = 1.2;
    const baseXP = 99;
    const currentLevel = Math.pow((xp/baseXP),(1 / exponent));

    return Math.floor(currentLevel) + 1;
  }

  const level = currentLevel(avatar.activityXP + avatar.battleXP);
  const qp = (level * 5) - 5;

  // Random modifier within -15% of base stat
  function randomizer(stat){
    let randomModifier = Math.floor(Math.random() * 15) * .01;
    //const positive = Math.floor(Math.random() * 2) === 1 ? true : false;
    //const modifiedStat = positive ? stat + (randomModifier * stat) : stat - (randomModifier * stat) ;
    const modifiedStat = stat - (randomModifier * stat) ;
    //console.log('STAT - ', stat, 'MODSTAT - ', modifiedStat, 'rand', randomModifier);
    return { stat : Math.floor(modifiedStat), modifier : randomModifier };
  }


  const baseFoeHealth = Math.floor(avatar.health * FOE_MOD.HEALTH);
  const baseFoePower = Math.floor(avatar.power * FOE_MOD.POWER);

  const healthAfterMod = randomizer(baseFoeHealth);
  const powerAfterMod = randomizer(baseFoePower);
  const qpAfterMod = randomizer(Math.floor(qp * FOE_MOD.QP));

  const averageMod = -((healthAfterMod.modifier + powerAfterMod.modifier +  qpAfterMod.modifier) / 3).toFixed(3);



  const foeWithStats = {
    health : healthAfterMod.stat,
    power : powerAfterMod.stat,
    armor : 0,
    fire : 0,
    earth : 0,
    water : 0,
    air : 0,
    difficulty : averageMod
  }

  const properties = ["health","power","armor"];
  //const properties = ["health","power","armor","fire","earth","water","air"];
  const baseFoeQp = qpAfterMod.stat;

  for(let points = baseFoeQp; points > 0; points-- ){
    const attr = properties[Math.floor(Math.random() * properties.length)];
    if(attr === "power"){
      foeWithStats.power += 1;
    }else if(attr === "health"){
      foeWithStats.health += 1;
    }else if(attr === "armor"){
      foeWithStats.armor += 1;
    }else if(attr === "fire"){
      foeWithStats.fire += 1;
    }else if(attr === "earth"){
      foeWithStats.earth += 1;
    }else if(attr === "water"){
      foeWithStats.water += 1;
    }else if(attr === "air"){
      foeWithStats.air += 1;
    }
  }

  return(foeWithStats);

}

module.exports = { generateFoeStats, selectFoeTemplate };