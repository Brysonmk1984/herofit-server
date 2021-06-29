const chance = require('chance')();

function postBattleEffects(a, f, outcomeData, effects){
  let avatar = { ...a };
  let foe = { ...f };
  let outcomeStatus = outcomeData.outcome;
  let postBattleEffects = [];
  if(effects && effects.length){
    postBattleEffects = effects.filter(effect => effect.type === 'postbattle');
  }

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
        }
        break;
      default:
        break;
    }
  }

  // AVATAR POSTBATTLE ABILITIES
  postBattleEffects.forEach((effect) =>{
    switch(effect.name){
      // Chameleon
      case 'Adaptive Camouflage':
        // If Foe won, 33% chance outcomeStatus will be changed to Draw and set health to 1
        if(outcomeData.outcome === 'Foe Wins'){
          const camoWorked = chance.bool({ likelihood: 33 });
          if(camoWorked){
            outcomeStatus = 'Draw';
            avatar = Object.assign({}, a, { health : 1, status : 'Recovering' });
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
          }
        }else if(outcomeData.outcome === 'Avatar Wins'){
          const selfDestructWorked = chance.bool({ likelihood: 2 });
          if(selfDestructWorked){
            outcomeStatus = 'Double KO';
            avatar = Object.assign({}, a, { health : 0, status : 'Knocked Out' });
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
          }
        }
        break;
      default:
        break;
    }
  });

  return {
    avatar, foe, outcomeStatus
  };
}

module.exports = postBattleEffects;