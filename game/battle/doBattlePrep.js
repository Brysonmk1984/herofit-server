const { FOE_NON_ACTION } = require('../CONSTANTS'); 
const chance = require('chance')();
const { scrambleStats } = require('../../lib/helperFunctions');

function doAvatarBattlePrep(avatar, foe, effects, scenario){
  const eAvatar = { ...avatar };
  let eFoe = { ...foe };
  const effectProcs = [];
  effects.forEach((effect) =>{

    switch(effect){
      case "Hero +5,+10% Water":
        eAvatar.water += 5;
        eAvatar.water += Math.floor(eAvatar.water * .10);
        effectProcs.push({
          effect : "Hero +5,+10% Water",
          heroStatsEffected : ["water"]
        });
        break;
      case "Hero +5,+10% Air":
        eAvatar.air += 5;
        eAvatar.air += Math.floor(eAvatar.air * .10);
        effectProcs.push({
          effect : "Hero +5,+10% Air",
          heroStatsEffected : ["air"],
        });
        break;
      case "Hero +5,+10% Earth":
        eAvatar.earth += 5;
        eAvatar.earth += Math.floor(eAvatar.earth * .10);
        effectProcs.push({
          effect : "Hero +5,+10% Earth",
          heroStatsEffected : ["earth"]
        });
        break;
      case "Hero +10 Health":
        eAvatar.health += 10;
        effectProcs.push({
          effect : "Hero +10 Health",
          heroStatsEffected : ["health"]
        });
        break;
      case "Hero +10,+15% Power":
        eAvatar.power += 10;
        eAvatar.power += Math.floor(eAvatar.power * .15);
        effectProcs.push({
          effect : "Hero +10,+15% Power",
          heroStatsEffected : ["power"]
        });
        break;
      case "Hero +10 Armor":
        eAvatar.armor += 10;
        effectProcs.push({
          effect : "Hero +10 Armor",
          heroStatsEffected : ["armor"]
        });
        break;
      case "Hero +15 Power":
        eAvatar.power += 15;
        effectProcs.push({
          effect : "Hero +15 Power",
          heroStatsEffected : ["power"]
        });
        break;
      case "Hero +15 Aether":
        eAvatar.aether += 15;
        effectProcs.push({
          effect : "Hero +15 Aether",
          heroStatsEffected : ["aether"]
        });
        break;
      case "Hero +25% Health":
        eAvatar.health += Math.floor(eAvatar.health * .25);
        effectProcs.push({
          effect : "Hero +25% Health",
          heroStatsEffected : ["health"]
        });
        break;
      case "Hero +33% Fire":
        eAvatar.fire += Math.floor(eAvatar.fire * .33);
        effectProcs.push({
          effect : "Hero +33% Fire",
          heroStatsEffected : ["fire"]
        });
        break;
      case "Hero +25,+25% Air":
        eAvatar.air += 25;
        eAvatar.air += Math.floor(eAvatar.air * .25);
        effectProcs.push({
          effect : "Hero +25,+25% Air",
          heroStatsEffected : ["air"]
        });
        break;
      case "Hero +25,+25% Earth":
        eAvatar.earth += 25;
        eAvatar.earth += Math.floor(eAvatar.earth * .25);
        effectProcs.push({
          effect : "Hero +25,+25% Earth",
          heroStatsEffected : ["earth"]
        });
        break;
      case "Hero +25,+25% Fire":
        eAvatar.fire += 25;
        eAvatar.fire += Math.floor(eAvatar.fire * .25);
        effectProcs.push({
          effect : "Hero +25,+25% Fire",
          heroStatsEffected : ["fire"]
        });
        break;
      case "Hero +25,+25% Water":
        eAvatar.water += 25;
        eAvatar.water += Math.floor(eAvatar.water * .25);
        effectProcs.push({
          effect : "Hero +25,+25% Water",
          heroStatsEffected : ["water"]
        });
        break;
      case "Hero +5% All Elements":
        eAvatar.fire += Math.floor(eAvatar.fire * .05);
        eAvatar.earth += Math.floor(eAvatar.earth * .05);
        eAvatar.water += Math.floor(eAvatar.water * .05);
        eAvatar.air += Math.floor(eAvatar.air * .05);
        eAvatar.aether += Math.floor(eAvatar.aether * .05);
        effectProcs.push({
          effect : "Hero +5% All Elements",
          heroStatsEffected : ["fire", "earth", "water", "air", "aether"]
        });
        break;
      case "Hero +10% All Elements":
        eAvatar.fire += Math.floor(eAvatar.fire * .10);
        eAvatar.earth += Math.floor(eAvatar.earth * .10);
        eAvatar.water += Math.floor(eAvatar.water * .10);
        eAvatar.air += Math.floor(eAvatar.air * .10);
        eAvatar.aether += Math.floor(eAvatar.aether * .10);
        effectProcs.push({
          effect : "Hero +10% All Elements",
          heroStatsEffected : ["fire", "earth", "water", "air", "aether"]
        });
        break;
      case "Foe -10|-3% Health":
        const threePercentHealth = Math.floor(eFoe.health * .03);
        eFoe.health -= threePercentHealth > 10 ? threePercentHealth : 10;
        effectProcs.push({
          effect : "Foe -10|-3% Health",
          foeStatsEffected : ["health"]
        });
        break;
      case "Foe -35|-5% Health":
        const fivePercentHealth = Math.floor(eFoe.health * .05);
        eFoe.health -= fivePercentHealth > 35 ? fivePercentHealth : 35;
        effectProcs.push({
          effect : "Foe -35|-5% Health",
          foeStatsEffected : ["health"]
        });
        break;
      case "Foe -10% Health":
        eFoe.health -= Math.floor(eFoe.health * .10);
        effectProcs.push({
          effect : "Foe -10% Health",
          foeStatsEffected : ["health"]
        });
        break;
      case "Ill Omen":
        const isNegativeScenario = scenario === 1 || scenario === 3 ? true : false;
        const isHigherDifficulty = foe.difficulty >= .07 || foe.class === 'titan' || foe.type === "Shadow Self" || foe.type === "High Priestess of the Tides" || foe.type === "Scorching Archfiend" || foe.type === "Hulking Aggro Crag" || foe.type === "Storming Oni";

        let illOmenProc = false;
        if(isNegativeScenario && isHigherDifficulty){
          illOmenProc = chance.bool({ likelihood: 75 });
        }
        if(illOmenProc){
          eAvatar.health = Math.floor(avatar.health * 1.2);
          effectProcs.push({
            effect : "Ill Omen",
            heroStatsEffected : ["health"]
          });
        }
        
        break;
      case "Bad Luck":
        const badLuckProc = chance.bool({ likelihood: 25 });
        
        // If badluck effect happens, randomly reduce a non-zero foe stat to 50%
        if(badLuckProc){
          const possibleStats = ['power','armor','health','water','air','fire','earth'];
          const foeStatArr = [];

          for(let stat in eFoe){
            if(possibleStats.includes(stat)){
              if(eFoe[stat] > 0){
                foeStatArr.push(stat);
              }
            }
          }

          const statToReduce = foeStatArr[Math.floor(Math.random() * foeStatArr.length)];
          eFoe[statToReduce] = Math.floor(foe[statToReduce] * .5);
          effectProcs.push({
            effect : "Bad Luck",
            foeStatsEffected : [eFoe[statToReduce]]
          });
        }
        break;
      case 'Lethal Surprise':
        const lethalSurpriseProc = chance.bool({ likelihood: 3 });
        if(lethalSurpriseProc){
          eFoe.health = 1;
          effectProcs.push({
            effect : "Lethal Surprise",
            foeStatsEffected : ["health"]
          });
        }
        break;
      case 'Eight-Legged Ingenuity':
        const ingenuityProc = chance.bool({ likelihood: 33 });
        if(ingenuityProc){
          const possibleStats = ['power','armor','health','water','air','fire','earth'];
          eFoe = { ...scrambleStats(possibleStats, foe) };
          effectProcs.push({
            effect : "Eight-Legged Ingenuity",
            foeStatsEffected : ['power','armor','health','water','air','fire','earth']
          });
        }
        break;
      case 'Frisky Mischief':
        const friskyProc = chance.bool({ likelihood: 75 });
        if(friskyProc){
          const possibleStats = ['power','armor','health','water','air','fire','earth'];
          const mappedToOb = possibleStats.filter(stat => avatar[stat] > 0).map(stat => {
            return { [stat] : avatar[stat] || 0 }
          });

          // Only return the lowest value
          const lowestAvVal = mappedToOb.reduce((m, k)=> {
            return Math.min(m,avatar[Object.keys(k)[0]]);
          }, Infinity);
          
          // Finds the property of that value
          let avStatObj = mappedToOb.find(obj => {
            //console.log('look', Object.keys(obj), Object.keys(obj)[0]);
            const currentKey = Object.keys(obj)[0];
            if(obj[currentKey] === lowestAvVal){
              //console.log('in lowest match', lowestAvVal);
              return Object.keys(lowestAvVal);
            }
          });
          
          // Can't figure out why 
          if(!avStatObj){
            //console.log('avStatObj is undefined or null for some reason', avStatObj);
            break;
          }
          // THIS IS WHERE IT FAILED (BELOW)
          const avStat = Object.keys(avStatObj)[0];
          const avStatValue = Object.values(avStatObj)[0];
          const foeStatVal = foe[avStat];
          if(foeStatVal > avStatValue){
            eAvatar[avStat] = foeStatVal;
            eFoe[avStat] = lowestAvVal;
          }

          effectProcs.push({
            effect : "Frisky Mischief",
            heroStatsEffected : [avStat],
            foeStatsEffected : [avStat]
          });

        }          
        break;
        default:
        break;
    }
  });

  return { avatar : eAvatar, foe : eFoe, procs : effectProcs };
}

function doFoeBattlePrep(avatar, foe, scenarioId){
  const ability = foe.ability;
  const effectProcs = [];
  if(ability && ability.type === 'prebattle'){
    if(scenarioId !== FOE_NON_ACTION){
      let fAvatar = { ...avatar };
      let fFoe = { ...foe };
      switch(ability.name){
        case "From the Shadows":
          // Increased Power
          fFoe.power = Math.floor(foe.power + (foe.power * .35));
          effectProcs.push({
            effect : "From the Shadows",
            foeStatsEffected : ["power"]
          });
          break;
        case "Intimidation":
          // Power Reduction
          fAvatar.power = Math.floor(avatar.power - (avatar.power * .5));
          effectProcs.push({
            effect : "Intimidation",
            heroStatsEffected : ["power"],
          });
          break;
        case "Paranormal Pandemonium":
          // Stat Scramble
          const stats = ["armor", "earth", "fire", "water", "air", "power", "health"];
        
          fAvatar = {...scrambleStats(stats, avatar)};
          effectProcs.push({
            effect : "Paranormal Pandemonium",
            heroStatsEffected : ["armor", "earth", "fire", "water", "air", "power", "health"]
          });
          break;
        case "Unholy Armor":
          const foeArmor = foe.armor;
          const foeHealth = foe.health;
          // Unholy Armor
          // Bonus to Armor & Health
          fFoe.armor = Math.floor(foeArmor + (foeArmor * .33));
          fFoe.health = Math.floor(foeHealth + (foeHealth * .1));
          effectProcs.push({
            effect : "Unholy Armor",
            foeStatsEffected : ["health", "armor"]
          });
          break;
        case "Can't Hide from Me":
          // Armor Break
          fAvatar.armor = 0;
          effectProcs.push({
            effect : "Can't Hide from Me",
            heroStatsEffected : ["armor"],
          });
          break;
        case "Shadowy Influx":
          // Health Bonus
          fFoe.health = Math.floor(foe.health + (foe.health * .2));
          effectProcs.push({
            effect : "Shadowy Influx",
            foeStatsEffected : ["health"]
          });
          break;
        case "Breath Bane":
          // Health Reduction
          fAvatar.health = Math.floor(avatar.health - (avatar.health * .2));
          effectProcs.push({
            effect : "Breath Bane",
            heroStatsEffected : ["health"],
          });
          break;
        case "Sadistic Siphon":
          // Health Steal
          const avatarHealth = avatar.health;
          const stolenHealth =  avatarHealth * .166;

          fFoe.health = Math.floor(foe.health + stolenHealth);
          fAvatar.health = Math.floor(avatar.health - stolenHealth);
          effectProcs.push({
            effect : "Sadistic Siphon",
            heroStatsEffected : ["health"],
            foeStatsEffected : ["health"]
          });
          break ;
          default:
          break;
      }

      return { avatar : fAvatar, foe : fFoe, procs : effectProcs  };

    }
  }
  
  return { avatar, foe, procs : effectProcs };
  
}


module.exports = { doAvatarBattlePrep, doFoeBattlePrep }