const { FOE_MOD } = require('./constants'); 
const villains = require('./villains.json');

function selectFoeTemplate(level){
  // 1 in 100 chance of fighting Titan
  // Must be level 10
  // const randomNum = Math.floor(Math.random() * 100);
  // if(randomNum === 0 && level >= 10){
  //   return villains.Titans[Math.floor(Math.random() * villains.Titans.length)];
  // }

  // Must be at least level 10 to have a shot at getting matched against shadow self
  if(level >= 10){
    return villains.Spirits[Math.floor(Math.random() * villains.Spirits.length)];
  }else{
    return villains.Spirits[Math.floor(Math.random() * (villains.Spirits.length -1))];
  }
}

function generateFoeStats(avatar, foe){

  // GIVES CURRENT LEVEL based on XP input
  function currentLevel(xp){
    const exponent = 1.2;
    const baseXP = 99;
    const currentLevel = Math.pow((xp/baseXP),(1 / exponent));

    return Math.floor(currentLevel) + 1;
  }

  const level = currentLevel(avatar.activityXP + avatar.battleXP);
  const qp = (level * 5) - 5;

  function randomizer(stat){
    let randomModifier = Math.floor(Math.random() * 15) * .01;
    const positive = Math.floor(Math.random() * 2) === 1 ? true : false;
    randomModifier = randomModifier;
    const modifiedStat = positive ? stat + (randomModifier * stat) : stat - (randomModifier * stat) ;
    return Math.floor(modifiedStat);

  }


  const baseFoeHealth = Math.floor(avatar.health * FOE_MOD.HEALTH);
  const baseFoePower = Math.floor(avatar.power * FOE_MOD.POWER);


  const foeWithStats = {
    health : randomizer(baseFoeHealth),
    power : randomizer(baseFoePower),
    armor : 0,
    fire : 0,
    earth : 0,
    water : 0,
    air : 0
  }

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

  const properties = ["health","power","armor"];
  //const properties = ["health","power","armor","fire","earth","water","air"];
  const baseFoeQp = randomizer(Math.floor(qp * FOE_MOD.QP));

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