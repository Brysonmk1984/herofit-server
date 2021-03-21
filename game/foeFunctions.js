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

  // Get specific foe foe testing purposes
  //return villains.Spirits[4];

  // Must be at least level 20 to have a shot at getting matched against Plaguebringer
  if(level >= 20){
    const randomNum = Math.floor(Math.random() * 18);
    // Probability of facing one of many bosses = 1/18
    if(true || randomNum === 0){
      const randomNum2 = Math.floor(Math.random() * 3);
      // Probability of facing Plaguebringer = 2/3
      if(true ||randomNum === 0 || randomNum === 1){
        villain = villains.Titans[0];
      }else{
        villain = villains.Spirits[villains.Spirits.length -1];
      }
    }else{
      villain = villains.Spirits[Math.floor(Math.random() * (villains.Spirits.length -1))];
    }
  // Must be at least level 10 to have a shot at getting matched against shadow self
  }else if(level >= 10){
    // 1 in 18 will face Shadow-Self
    const randomNum = Math.floor(Math.random() * 18);
    
    // Shadow-Self
    if(randomNum === 0){
      villain = villains.Spirits[villains.Spirits.length -1];

    }else{
      // Otherwise, they'll face another random spirit
      // Math.floor ensures the last array item will never be picked, it gets rounded down.
      villain = villains.Spirits[Math.floor(Math.random() * (villains.Spirits.length -1))];
    }
  }else{
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
  function randomizer(stat, modifierInteger = -15){
    let randomModifierDecimal = Math.floor(Math.random() * modifierInteger) * .01;
    const modifiedStat = stat + (randomModifierDecimal * stat);
    return { stat : Math.floor(modifiedStat), modifier : randomModifierDecimal };
  }


  const baseFoeHealth = Math.floor(avatar.health * FOE_MOD.HEALTH);
  const baseFoePower = Math.floor(avatar.power * FOE_MOD.POWER);

  let healthAfterMod;
  let powerAfterMod;
  let qpAfterMod;
  // If boss, randomize higher stats
  if(foe.class === 'Titans'){
    healthAfterMod = randomizer(baseFoeHealth, -5);
    powerAfterMod = randomizer(baseFoePower, -15);
    qpAfterMod = randomizer(Math.floor(qp * FOE_MOD.QP), -3);
  }else{
    healthAfterMod = randomizer(baseFoeHealth);
    powerAfterMod = randomizer(baseFoePower);
    qpAfterMod = randomizer(Math.floor(qp * FOE_MOD.QP));
  }


  const averageMod = -((healthAfterMod.modifier + powerAfterMod.modifier +  qpAfterMod.modifier) / 3).toFixed(3);

  let foeWithStats;
  let qpAdjustedStats;
  // Spirits don't have elemental power, all others do
  if(foe.class === 'Spirits'){
    foeWithStats = {
      health : healthAfterMod.stat,
      power : powerAfterMod.stat,
      armor : 0,
      fire : 0,
      earth : 0,
      water : 0,
      air : 0,
      difficulty : averageMod
    }
    qpAdjustedStats = ["health","power","armor"];
  // Titans base elemental power is their power, divided by 4 - 1 for each element. Their QP adjusted stats are all
  // Going with 1/8 power for elements... otherwise too difficult. Also, setting a baseline 200 for health on PB
  }else if(foe.class === 'Titans'){
    const powerQuarter = Math.floor(powerAfterMod.stat / 8);
    foeWithStats = {
      health : healthAfterMod.stat < 200 ? 200 : healthAfterMod.stat,
      power : powerAfterMod.stat,
      armor : 0,
      fire : powerQuarter,
      earth : powerQuarter,
      water : powerQuarter,
      air : powerQuarter,
      difficulty : averageMod
    }
    qpAdjustedStats = ["health","power","armor","fire","earth","water","air"];
  // Any other foe... still need to work on this. Just using the Spirit template right now.
  }else{
    foeWithStats = {
      health : healthAfterMod.stat,
      power : powerAfterMod.stat,
      armor : 0,
      fire : 0,
      earth : 0,
      water : 0,
      air : 0,
      difficulty : averageMod
    }
    qpAdjustedStats = ["health","power","armor"];
  }


  const baseFoeQp = qpAfterMod.stat;

  for(let points = baseFoeQp; points > 0; points-- ){
    const attr = qpAdjustedStats[Math.floor(Math.random() * qpAdjustedStats.length)];
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