const chance = require('chance')();
const { FOE_MOD, XP_BASE_LEVEL, LEVEL_CURVE, LEVEL_DIFFICULTY_MOD, LOW_LEVEL, HIGH_LEVEL, HIGH_LEVEL_DIFFICULTY_MOD } = require('./CONSTANTS'); 
const villains = require('./villains.json');
const { config } = require('../appConfig');
const { handleFoeLikelihood, handleFoeBonusToStats } = require('./specialEvents/foeActionHandlers');

// Decides which foe template will be chosen for battle before stats are added
function selectFoeTemplate(level){

  const event = config.specialEvent;
  // If Special Event is live, run code to attempt any special foe events
  if(event){
    const foeLikelihoodAts = event.actionTypes.filter((at) => at.type === 'foeLikelihood');
    // If the event contains foeLikelihood actions
    if(foeLikelihoodAts.length){
      // Result of handleChanceForFoe function could be a foe object, or null
      const foe = handleFoeLikelihood(foeLikelihoodAts);
      // If foe object, return it instead of randomly selecting below
      if(foe){
        return foe;
      }
    }
  }

  // Merge all minor foes into one array, and all bosses in another
  const minorFoes = [];
  const levelRequiredFoes = [];
  // Each class of foes
  for(let fClass in villains){
    // assign foes to two different arrays depending on if there is a level requirement
    villains[fClass].forEach(foe => {
      const req = foe.levelRequirement;
      if(req && req <= level){
        levelRequiredFoes.push(foe);
      }else{
        minorFoes.push(foe);
      }
    });
  }
  //console.log('FCF-', minorFoes, levelRequiredFoes);
  
  // Decide which array of foes to randomly pick from...
  let bossEncounter = false
  if(levelRequiredFoes.length){
    bossEncounter = chance.bool({ likelihood: 5.5});
  }
  let finalFoeArray =  bossEncounter ? levelRequiredFoes : minorFoes;

  // Randomly select from finalFoeArray and return it as the selected foe
  return finalFoeArray[Math.floor(Math.random() * finalFoeArray.length)];
}

function generateFoeStats(avatar, foe){
  // GIVES CURRENT LEVEL based on XP input
  function currentLevel(xp){
    const exponent = LEVEL_CURVE;
    const baseXP = XP_BASE_LEVEL;
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
  const isHighLevel = level >= HIGH_LEVEL ? true : false;
  const isMidLevel = (LOW_LEVEL < level && level < HIGH_LEVEL) ? true : false;

  let baseQP = Math.floor((level * 5) - 5); 
  let baseFoeHealth = Math.floor(((level * 5) + 100) * FOE_MOD.HEALTH);
  let baseFoePower = Math.floor(((level * 5) + 100) * FOE_MOD.POWER);

  if(isMidLevel || isHighLevel){
    baseQP =  Math.floor(baseQP * LEVEL_DIFFICULTY_MOD); 
    baseFoeHealth = Math.floor(baseFoeHealth * LEVEL_DIFFICULTY_MOD);
    baseFoePower = Math.floor(baseFoePower * LEVEL_DIFFICULTY_MOD);
    if(isHighLevel){
      baseQP = Math.floor(baseQP * HIGH_LEVEL_DIFFICULTY_MOD); 
      baseFoeHealth = Math.floor(baseFoeHealth * HIGH_LEVEL_DIFFICULTY_MOD);
      baseFoePower = Math.floor(baseFoePower * HIGH_LEVEL_DIFFICULTY_MOD);
    }
  }

  //console.log('HEALTH-', baseFoeHealth,'POWER', baseFoePower );

  
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
        randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP));
       
        //console.log('BASE QP - ',baseQP, Math.floor(baseQP * FOE_MOD.QP),randomizedQP.stat );

        fws.health = randomizedHealth.stat;
        fws.power = randomizedPower.stat;

        if(foe.type === 'Phantasm'){
          qpAdjustedStats = ["health","health","armor"];
        }else{
          qpAdjustedStats = ["health","power","armor"];
        }
        break;
      }
    case 'Elementals':
      const elementalQp = FOE_MOD.QP * 1.3;

      randomizedHealth = randomizer(baseFoeHealth);
      randomizedPower = randomizer(baseFoePower);
      randomizedQP = randomizer(Math.floor(baseQP * elementalQp));
      

      fws.health = randomizedHealth.stat;
      fws.power = randomizedPower.stat;

      //Need to check for for types here for different elements
      switch(foe.type){
        case "Gusty Rascal":
          fws.air = 25;
          qpAdjustedStats = ["air", "armor","power","health"]; 
          break; 
        case "Rock Skipper":
          fws.earth = 25;
          qpAdjustedStats = ["earth", "armor","power","health"]; 
          break; 
        case "Flame Fiend":
          fws.fire = 25;
          qpAdjustedStats = ["fire", "armor","power","health"]; 
          break; 
        case "Splash Artist":
          fws.water = 25;
          qpAdjustedStats = ["water", "armor","power","health"]; 
          break; 
        case "Wheezing Jinn":
          fws.air = 75;
          qpAdjustedStats = ["air", "armor","power","health"]; 
          break; 
        case "Granite Golem":
          fws.earth = 75;
          qpAdjustedStats = ["earth", "armor","power","health"]; 
          break; 
        case "Burning Jinn":
          fws.fire = 75;
          qpAdjustedStats = ["fire", "armor","power","health"]; 
          break; 
        case "Cyclonic Siren":
          fws.water = 75;
          qpAdjustedStats = ["water", "armor","power","health"]; 
          break; 
        case "Storming Oni":
          fws.air = 200;
          qpAdjustedStats = ["air", "armor","power","health"]; 
          break; 
        case "Hulking Aggro Crag":
          fws.earth = 200;
          qpAdjustedStats = ["earth", "armor","power","health"]; 
          break; 
        case "Scorching Archfiend":
          fws.fire = 200;
          qpAdjustedStats = ["fire", "armor","power","health"]; 
          break; 
        case "High Priestess of the Tides":
          fws.water = 200;
          qpAdjustedStats = ["water", "armor","power","health"]; 
          break; 
        default :
          qpAdjustedStats = ["health","power","armor","fire","earth","water","air"]; 
          break; 
      }
      break;
    case 'Titans':
      randomizedHealth = randomizer(baseFoeHealth, -5);
      randomizedPower = randomizer(baseFoePower, -5);
      randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP), -1);

      // Titans base elemental power is their power, divided by 4 - 1 for each element. Their QP adjusted stats are all
      // Going with 1/8 power for elements... otherwise too difficult. Also, setting a baseline 200 for health on PB
      const powerEighth = Math.floor(randomizedPower.stat / 6.6);
      
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

  // Apply any special event actionTypes of type 'foeBonusToStats'
  const event = config.specialEvent;
  // If Special Event is live, run code to attempt any special foe events
  if(event){
    const foeBonusToStatsAts = event.actionTypes.filter((at) => at.type === 'foeBonusToStats');
    // If the event contains foeLikelihood actions
    if(foeBonusToStatsAts.length){
      // Result of handleChanceForFoe function could be a foe object, or null
      fws = handleFoeBonusToStats(foeBonusToStatsAts, fws);
    }
  }

  // Return foe with stats to be saved for upcoming battle!
  return fws;
}

module.exports = { generateFoeStats, selectFoeTemplate };