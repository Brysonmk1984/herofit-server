const xpCalc = require('../upgrades/xpCalc');
const { determineXpBounty, determinePtBounty } = require('../battle/determineBounties');
const { OUTCOME_XP } = require('../CONSTANTS'); 
const chance = require('chance')();
const { FOE_MOD,  LEVEL_DIFFICULTY_MOD, LOW_LEVEL, HIGH_LEVEL, HIGH_LEVEL_DIFFICULTY_MOD } = require('../CONSTANTS'); 
const villains = require('../villains.json');
const { config } = require('../../appConfig');
const { handleFoeLikelihood, handleFoeBonusToStats } = require('../specialEvents/foeActionHandlers');

const { currentLevelByInput } = xpCalc();

// Decides which foe template will be chosen for battle before stats are added
function selectFoeTemplate(level){
  //console.log('THE LEVEL = ', level);
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
      //console.log(foe.type, req);
      // If foe is not an item only foe
      if(!foe.itemSummonOnly){
        if(req && req <= level){
          levelRequiredFoes.push(foe);
        }else if(!req){
          minorFoes.push(foe);
        }
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
  const { total : totalLevel } = currentLevelByInput(avatar.activityXP + avatar.battleXP);


  // Random modifier within -15% of base stat
  function randomizer(stat, modifierInteger = -15){
    let randomModifierDecimal = Math.floor(Math.random() * modifierInteger) * .01;
    const modifiedStat = stat + (randomModifierDecimal * stat);
    return { stat : Math.floor(modifiedStat), modifier : randomModifierDecimal };
  }

  const isHighLevel = totalLevel >= HIGH_LEVEL ? true : false;
  const isMidLevel = (LOW_LEVEL < totalLevel && totalLevel < HIGH_LEVEL) ? true : false;

  let baseQP = Math.floor((totalLevel * 5) - 5); 
  let baseFoeHealth = Math.floor((((totalLevel * 5) + 100) * FOE_MOD.HEALTH));
  let baseFoePower = Math.floor((((totalLevel * 5) + 100) * FOE_MOD.POWER));

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

        fws.health = Math.floor(randomizedHealth.stat);
        fws.power = Math.floor(randomizedPower.stat);

        if(foe.type === 'Phantasm'){
          qpAdjustedStats = ["health","health","armor"];
        }else{
          qpAdjustedStats = ["health","power","armor"];
        }
        break;
      }
    case 'Elementals':
      let elementalQp = FOE_MOD.QP
      let baseHealth = baseFoeHealth;
      let basePower = baseFoePower;
      const bosses = ['Storming Oni', 'Hulking Aggro Crag', 'Scorching Archfiend', 'High Priestess of the Tides'];
      const adepts = ['Wheezing Jinn', 'Granite Golem', 'Burning Jinn', 'Cyclonic Siren'];
      if(bosses.includes(foe.type)){
        elementalQp *= 1.5;
        baseHealth *= 1.2;
        basePower *= 1.1;
      }else if(adepts.includes(foe.type)){
        elementalQp *= 1.3;
        baseHealth *= 1.1;
      }else{
        elementalQp *= 1.2;
      }

 
      randomizedHealth = randomizer(baseHealth);
      randomizedPower = randomizer(basePower);
      randomizedQP = randomizer(Math.floor(baseQP * elementalQp));

      fws.health = Math.floor(randomizedHealth.stat);
      fws.power = Math.floor(randomizedPower.stat);

      //Need to check for for types here for different elements
      switch(foe.type){
        case "Gusty Rascal":
          fws.air = 50;
          qpAdjustedStats = ["air", "armor","power","health"]; 
          break; 
        case "Rock Skipper":
          fws.earth = 50;
          qpAdjustedStats = ["earth", "armor","power","health"]; 
          break; 
        case "Flame Fiend":
          fws.fire = 50;
          qpAdjustedStats = ["fire", "armor","power","health"]; 
          break; 
        case "Splash Artist":
          fws.water = 50;
          qpAdjustedStats = ["water", "armor","power","health"]; 
          break; 
        case "Wheezing Jinn":
          fws.air = (100 + (totalLevel));
          qpAdjustedStats = ["air", "armor","power","health"]; 
          break; 
        case "Granite Golem":
          fws.earth = (100 + (totalLevel));
          qpAdjustedStats = ["earth", "armor","power","health"]; 
          break; 
        case "Burning Jinn":
          fws.fire = (100 + (totalLevel));
          qpAdjustedStats = ["fire", "armor","power","health"]; 
          break; 
        case "Cyclonic Siren":
          fws.water = (100 + (totalLevel));
          qpAdjustedStats = ["water", "armor","power","health"]; 
          break; 
        case "Storming Oni":
          fws.air = (150 + (3 * totalLevel));
          qpAdjustedStats = ["air", "armor","power","health"]; 
          break; 
        case "Hulking Aggro Crag":
          fws.earth = (150 + (3 * totalLevel));
          qpAdjustedStats = ["earth", "armor","power","health"]; 
          break; 
        case "Scorching Archfiend":
          // Scorching Archfiend Still needs more difficulty;
          randomizedQP = randomizer(Math.floor(baseQP * FOE_MOD.QP * 1.3));

          fws.fire = (150 + (3 * totalLevel));
          qpAdjustedStats = ["fire", "armor","power","health"]; 
          
          break; 
        case "High Priestess of the Tides":
          fws.water = (150 + (3 * totalLevel));
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
      const powerEighth = Math.floor(randomizedPower.stat / 12);
      
      fws.health = Math.floor(randomizedHealth.stat);
      fws.power = Math.floor(randomizedPower.stat);
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

// Foe param is usually null, unless an item created the battle
function determineFoeWithStats(avatar, foeTemplate = null){
  const { level, albedo } = currentLevelByInput(avatar.activityXP + avatar.battleXP);

  // Use passed in foe template, otherwise randomly pick one
  foeTemplate = foeTemplate ? foeTemplate : selectFoeTemplate(level);

  
  let foeName;
  
  if(foeTemplate.type === 'Shadow-Self'){
    foeName = `Shadow ${avatar.name}`;
  }else{
    // specific foe for testing purposes
    //foeName = foeTemplate.foe[1];
    
    foeName = foeTemplate.foe[Math.floor(Math.random() * foeTemplate.foe.length)];
  }
  
  const foe = {
    id : foeTemplate.id,
    type : foeTemplate.type,
    name : foeName,
    ability : foeTemplate.ability,
    class : foeTemplate.class
  }
  const foeWithStats = Object.assign({}, foe, generateFoeStats(avatar, foe));
  
  
  foeWithStats.xpBounty = determineXpBounty(OUTCOME_XP.base, foeWithStats.difficulty, level, foeTemplate.bonusXpBase, foeWithStats.type);
  foeWithStats.ptBounty = determinePtBounty(level, foeTemplate.bonusPtBase, foeWithStats.type);
  
  return foeWithStats;
}


function findFoeTemplateByType(foeType){
  const allFoes = [];
  for(let foeClass in villains){
    allFoes.push(...villains[foeClass]);
  }

  return allFoes.find(foe => foe.type === foeType);
};

module.exports = { generateFoeStats, selectFoeTemplate, determineFoeWithStats, findFoeTemplateByType };
