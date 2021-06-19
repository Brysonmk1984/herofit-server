const chance = require('chance')();

function postBattleEffects(avatar, foe, outcomeStatus){
  const fAbility = foe.ability;
  if(fAbility.type === 'postbattle'){
    switch(fAbility.name){
      //PLAGUEBRINGER
      case 'Infect':
        // Only apply Infect if the hero won or DRAW, otherwise he should just be knocked out
        if(outcomeStatus === 'Avatar Wins' || outcomeStatus === 'Draw'){
          const status = 'Infected';
          const statusFade = 12;

          return { avatar : Object.assign({}, avatar, { status, statusFade }), outcomeStatus };
        }

        return { avatar, outcomeStatus };
      
      // Chameleon
      case 'Adaptive Camouflage':
        // If Foe won, 50% chance outcomeStatus will be changed to Draw and set health to 1
        if(outcomeStatus === 'Foe Wins'){
          const camoWorked = chance.bool({ likelihood: 50 });
          if(camoWorked){
            const health = 1;
            const outcomeStatus = 'Draw';
            return { avatar : Object.assign({}, avatar, { health }), outcomeStatus };
          }
        }

      // Robot
      case 'Unstable Prototype':
        // If Foe won, 33% chance to destroy foe
        if(outcomeStatus === 'Foe Wins'){
          const selfDestructWorked = chance.bool({ likelihood: 33 });
          if(selfDestructWorked){
            const outcomeStatus = 'Double KO';
            return { avatar, outcomeStatus };
          }
        }
        return { avatar, outcomeStatus };
      default:
        return;
    }
  }

  return {
    avatar, outcomeStatus
  };
}

module.exports = postBattleEffects;