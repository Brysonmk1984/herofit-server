const chance = require('chance')();

function postBattleEffects(a, f, o, effects=[]){
  let avatar = { ...a };
  let outcomeStatus = o;
  const postBattleEffects = effects.filter(effect => effect.type === 'postbattle');

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
        if(o === 'Foe Wins'){
          const camoWorked = chance.bool({ likelihood: 33 });
          if(camoWorked){
            const health = 1;
            outcomeStatus = 'Draw';
            avatar = Object.assign({}, a, { health, status : 'Recovering' });
          }
        }
        break;
      // Robot
      case 'Unstable Prototype':
        // If Foe won, 33% chance to destroy foe
        if(o === 'Foe Wins'){
          const selfDestructWorked = chance.bool({ likelihood: 33 });
          if(selfDestructWorked){
            outcomeStatus = 'Double KO';
          }
        }
        break;
      // Unicorn
      case 'Heroes Never Die':
        // If Foe won, 33% chance to destroy foe
        if(o === 'Foe Wins' || o === 'Double KO'){
          const reviveWorked = chance.bool({ likelihood: 50 });
          if(reviveWorked){
            avatar = Object.assign({}, a, { health : 1 });
          }
        }
        break;
      default:
        break;
    }
  });

  return {
    avatar, outcomeStatus
  };
}

module.exports = postBattleEffects;