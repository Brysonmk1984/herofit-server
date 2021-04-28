const { FOE_MOD } = require('./constants'); 
const villains = require('./villains.json');
const { config } = require('../appConfig');
const { handleChanceForFoe } = require('./specialEvents/foeActionHandlers');

function selectFoeTemplate(level){
  // 1 in 100 chance of fighting Titan
  // Must be level 10
  // const randomNum = Math.floor(Math.random() * 100);
  // if(randomNum === 0 && level >= 10){
  //   return villains.Titans[Math.floor(Math.random() * villains.Titans.length)];
  // }
  let villain;

  // Get specific foe foe testing purposes
  //return villains.Spirits[3];

  // If Special Event is live, run code to attempt any special foe events
  if(config.specialEvent.isLive){
    // Must return a villain
    villain = handleChanceForFoe(config.specialEvent);

    if(villain){
      return villain;
    }
  }



  // Must be at least level 20 to have a shot at getting matched against Plaguebringer
  if(level >= 20){
    const randomNum = Math.floor(Math.random() * 18);
    // Probability of facing one of many bosses = 1/18
    if(randomNum === 0){
      const randomNum2 = Math.floor(Math.random() * 3);
      // Probability of facing Plaguebringer = 2/3
      if(randomNum2 === 0 || randomNum2 === 1){
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
  // GIVES CURRENT LEVEL based on XP input
  function currentLevel(xp){
    const exponent = 1.2;
    const baseXP = 99;
    const currentLevel = Math.pow((xp/baseXP),(1 / exponent));

    return Math.floor(currentLevel) + 1;
  }

  // Random modifier within -15% of base stat
  function randomizer(stat, modifierInteger = -15){
    let randomModifierDecimal = Math.floor(Math.random() * modifierInteger) * .01;
    const modifiedStat = stat + (randomModifierDecimal * stat);
    return { stat : Math.floor(modifiedStat), modifier : randomModifierDecimal };
  }

  const level = currentLevel(avatar.activityXP + avatar.battleXP);
  const qp = (level * 5) - 5; 
  const baseFoeHealth = Math.floor(avatar.health * FOE_MOD.HEALTH);
  const baseFoePower = Math.floor(avatar.power * FOE_MOD.POWER);
  
  // Different foes adjust QP differently on their stats
  // determined below in switch statement
  let qpAdjustedStats = [];

  // Foe with stats
  let fws = {
    health : 0,
    power : 0,
    armor : 0,
    fire : 0,
    earth : 0,
    water : 0,
    air : 0,
    difficulty : 0
  };
  let randomizedHealth, randomizedPower, randomizedQP;

  switch(foe.class){
    case 'Spirits':
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
      }else{
        randomizedHealth = randomizer(baseFoeHealth);
        randomizedPower = randomizer(baseFoePower);
        randomizedQP = randomizer(Math.floor(qp * FOE_MOD.QP));

        fws.health = randomizedHealth.stat;
        fws.power = randomizedPower.stat;


        qpAdjustedStats = ["health","power","armor"];
        break;
      }
    case 'Elementals':
      randomizedHealth = randomizer(baseFoeHealth);
      randomizedPower = randomizer(baseFoePower);
      randomizedQP = randomizer(Math.floor(qp * FOE_MOD.QP));

      fws.health = randomizedHealth.stat;
      fws.power = randomizedPower.stat;
      console.log('FOE TYPE - ', foe.type);
      //Need to check for for types here for different elements
      switch(foe.type){
        case "Gusty Rascal":
          qpAdjustedStats = ["air"]; 
          break; 
        default :
          qpAdjustedStats = ["health","power","armor","fire","earth","water","air"]; 
          break; 
      }
      break;
    case 'Titans':
      randomizedHealth = randomizer(baseFoeHealth, -12);
      randomizedPower = randomizer(baseFoePower, -20);
      randomizedQP = randomizer(Math.floor(qp * FOE_MOD.QP), -5);

      // Titans base elemental power is their power, divided by 4 - 1 for each element. Their QP adjusted stats are all
      // Going with 1/8 power for elements... otherwise too difficult. Also, setting a baseline 200 for health on PB
      const powerEighth = Math.floor(randomizedPower.stat / 8);
      
      fws.health = randomizedHealth.stat;
      fws.power = randomizedPower.stat;
      fws.fire = powerEighth;
      fws.earth = powerEighth;
      fws.water = powerEighth;
      fws.air = powerEighth;
      qpAdjustedStats = ["health","power","armor","fire","earth","water","air"]; 
      
      break;

    default:
    // Shouldn't happen 
  }
  // ON ALL FOES EXCEPT SHADOW-SELF:

  // Calculates the overall difficulty modification after randomization. Used for pt and xp after battles
  fws.difficulty = -((randomizedHealth.modifier + randomizedPower.modifier +  randomizedQP.modifier) / 3).toFixed(3);
  
  // Randomize the stat distribution for foes
  const baseFoeQp = randomizedQP.stat;
  for( let points = baseFoeQp; points > 0; points-- ){
    const attr = qpAdjustedStats[Math.floor(Math.random() * qpAdjustedStats.length)];
    fws[attr] += 1;
  }

  // Return foe with stats to be saved for upcoming battle!
  return fws;
}

module.exports = { generateFoeStats, selectFoeTemplate };