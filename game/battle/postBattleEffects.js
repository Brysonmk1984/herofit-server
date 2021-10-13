const chance = require('chance')();

// Effects passed in here are the ones saved in the 'effects' column'
// The 'effectProcs' column, which is only used for display purposes, will include both these effects AND 'effects' from avatar & foe abilities
function postBattleEffects(a, f, outcomeData, effects){
  let avatar = { ...a };
  let foe = { ...f };
  let outcomeStatus = outcomeData.outcome;
  let effectProcs = [];

  // FOE POSTBATTLE ABILITIES
  if(f.ability.type === 'postbattle'){
    switch(f.ability.name){
      //PLAGUEBRINGER
      case 'Infect':
        // Only apply Infect if the hero won or DRAW, otherwise he should just be knocked out
        if(outcomeStatus === 'Avatar Wins' || outcomeStatus === 'Draw'){
          const status = 'Infected';
          const statusFade = 12;
          avatar = Object.assign({}, a, { status, statusFade });
          effectProcs.push({
            effect : "Infect",
            type : "postbattle"
          });
        }
        break;

      // Guardian of the Depths
      case '-10% Health Afterburn':
        // If Hero won, or Draw, deal 10% of health more damage to hero and potentially change outcome
        if(outcomeData.outcome === 'Avatar Wins' || outcomeData.outcome === 'Draw'){
          avatar.health -= (avatar.maxHealth * .1);
          if(avatar.health <= 0){
            // If foe won, change to DKO since Afterburn killed foe
            if(outcomeData.outcome === 'Avatar Wins'){
              outcomeStatus = 'Double KO';
            // If Draw, change to Avatar Wins since Afterburn killed foe
            }else if(outcomeData.outcome === 'Draw'){
              outcomeStatus = 'Foe Wins';
            }
            effectProcs.push({
              effect : "-10% Health Afterburn",
              type : "postbattle"
            });
          }
        }
        break;
      default:
        break;
    }
  }

  // AVATAR POSTBATTLE ABILITIES
  effects.forEach((effect) =>{
    switch(effect.name){
      // Chameleon
      case 'Adaptive Camouflage':
        // If Foe won, 33% chance outcomeStatus will be changed to Draw and set health to 1
        if(outcomeData.outcome === 'Foe Wins'){
          const camoWorked = chance.bool({ likelihood: 33 });
          if(camoWorked){
            outcomeStatus = 'Draw';
            avatar = Object.assign({}, a, { health : 1, status : 'Recovering' });
            effectProcs.push({
              effect : "Adaptive Camouflage",
              type : "postbattle"
            });
          }
        }
        break;
      // Robot
      case 'Unstable Prototype':
        // If Foe won, 33% chance to destroy foe
        if(outcomeData.outcome === 'Foe Wins'){
          const selfDestructWorked = chance.bool({ likelihood: 33 });
          if(selfDestructWorked){
            outcomeStatus = 'Double KO';
            effectProcs.push({
              effect : "Unstable Prototype",
              type : "postbattle"
            });
          }
        }else if(outcomeData.outcome === 'Avatar Wins'){
          const selfDestructWorked = chance.bool({ likelihood: 2 });
          if(selfDestructWorked){
            outcomeStatus = 'Double KO';
            avatar = Object.assign({}, a, { health : 0, status : 'Knocked Out' });
            effectProcs.push({
              effect : "Unstable Prototype",
              type : "postbattle"
            });
          }
        }
        break;
      // Unicorn
      case 'Heroes Never Die':
        // If Foe won, 50% chance to revive
        if(outcomeData.outcome === 'Foe Wins' || outcomeData.outcome === 'Double KO'){
          const reviveWorked = chance.bool({ likelihood: 50 });
          if(reviveWorked){
            avatar = Object.assign({}, a, { health : 1, status : 'Recovering' });
            effectProcs.push({
              effect : "Heroes Never Die",
              type : "postbattle"
            });
          }
        }
        break;
      // Dragon Whelp
      case '+25 Damage Afterburn':
        // If Foe won, or Draw, deal 25 more damage to foe and potentially change outcome
        if(outcomeData.outcome === 'Foe Wins' || outcomeData.outcome === 'Draw'){
          foe.health -= 25;
          if(foe.health <= 0){
            // If foe won, change to DKO since Afterburn killed foe
            if(outcomeData.outcome === 'Foe Wins'){
              outcomeStatus = 'Double KO';
            // If Draw, change to Avatar Wins since Afterburn killed foe
            }else if(outcomeData.outcome === 'Draw'){
              outcomeStatus = 'Avatar Wins';
            }
            effectProcs.push({
              effect : "+25 Damage Afterburn",
              type : "postbattle"
            });
          }
        }
        break;
        
              
      // Plagueling
      case 'Bolstered Immune System':
        // Only apply if Hero is infected
        if(a.status === 'Infected'){
          const status = 'Recovering';
          const statusFade = 0;
          avatar = Object.assign({}, a, { status, statusFade });
          effectProcs.push({ effect : "Bolstered Immune System", type : "postbattle"}); 
        }
        break;
      default:
        break;
    }
  });

  return {
    avatar, foe, outcomeStatus, effectProcs
  };
}

module.exports = postBattleEffects;