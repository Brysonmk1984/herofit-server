const { FOE_MOD } = require('./constants'); 

function generateFoe(avatar){

  // GIVES CURRENT LEVEL based on XP input
  function currentLevel(xp){
    const exponent = 1.2;
    const baseXP = 99;
    const currentLevel = Math.pow((xp/baseXP),(1 / exponent));

    return Math.floor(currentLevel) + 1;
  }

  //avatar = JSON.parse(avatar);
  const { activityXP, battleXP, health, power } = avatar;

  const xp = activityXP + battleXP;
  const level = currentLevel(xp);
  const qp = (level * 5) - 5;

  function randomizer(stat){
    let randomModifier = Math.floor(Math.random() * 15) * .01;
    const positive = Math.floor(Math.random() * 2) === 1 ? true : false;
    randomModifier = randomModifier;
    const modifiedStat = positive ? stat + (randomModifier * stat) : stat - (randomModifier * stat) ;
    return Math.floor(modifiedStat);

  }

  const baseFoeXP = Math.floor(xp * FOE_MOD.XP);
  const baseFoeHealth = 100; //Math.floor(health * FOE_MOD.HEALTH);
  const baseForQp = Math.floor(qp * FOE_MOD.QP);
  const baseFoePower = 100; //Math.floor(power * FOE_MOD.POWER);

  const foe = {
    xp : randomizer(baseFoeXP),
    health : randomizer(baseFoeHealth),
    qp : randomizer(baseForQp),
    power : randomizer(baseFoePower),
    armor : 0,
    fire : 0,
    earth : 0,
    water : 0,
    air : 0
  }

  const properties = ["health","power","armor"];
  //const properties = ["health","power","armor","fire","earth","water","air"];

  for(let points = foe.qp; points > 0; points-- ){
    const attr = properties[Math.floor(Math.random() * properties.length)];
    if(attr === "power"){
      foe.power += 3;
    }else if(attr === "health"){
      foe.health += 1;
    }else if(attr === "armor"){
      foe.armor += 1;
    }else if(attr === "fire"){
      foe.fire += 1;
    }else if(attr === "earth"){
      foe.earth += 1;
    }else if(attr === "water"){
      foe.water += 1;
    }else if(attr === "air"){
      foe.air += 1;
    }
  }

  return(foe);

}

module.exports = generateFoe;