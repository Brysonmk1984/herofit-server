
function doAvatarBattlePrep(avatar, foe, effects){
  effects.forEach((effect) =>{
    switch(effect){
      case "Battle: Hero +10 Health":
        avatar.health += 10;
        break;
      case "Battle: Hero +5 Water":
        avatar.water += 5;
        break;
      case "Battle: Foe -10 Health":
        foe.health -= 10;
        break;
      default:
        break;
    }
  });
  return { avatar, foe };
}

function doFoeBattlePrep(foe, avatar, itemsUsed, ability){

  switch(ability.name){
    case "From the Shadows":
      // Increased Power
      foe.power = Math.floor(foe.power + (foe.power * .2));
      break;
    case "Intimidation":
      // Power Reduction
      avatar.power = Math.floor(avatar.power - (avatar.power * .2));
      break;
    case "Paranormal Pandemonium":
      // Stat Scramble
      const scrambledStats = {
        power : 0,
        health : 0,
        armor : 0,
        earth : 0,
        water : 0,
        air : 0,
        fire : 0
      };

      const stats = ["armor", "earth", "fire", "water", "air", "power", "health"];
      
      for(let stat in scrambledStats){
        const randomStat = stats[ Math.floor(Math.random() * stats.length) ];
        const statPosition = stats.findIndex((s) => s === randomStat);
        const statVal = stats.splice(statPosition,1);
        scrambledStats[stat] = Math.floor(avatar[statVal[0]]);
      }
      
      // possibly swap power for health
      // const swapHealthWithPower = Math.floor(Math.random() * 1);
      // if(swapHealthWithPower){
      //   const aHealth = avatar.health;
      //   const aPower = avatar.power;
      //   scrambledStats.power = aHealth;
      //   scrambledStats.health = aPower;
      // }
      avatar = Object.assign({}, avatar, scrambledStats);
      break;
    case "Unholy Armor":
      const foeArmor = foe.armor;
      // Unholy Armor
      // Bonus to Armor
      // Also has higher health from stats
      foe.armor = Math.floor(foeArmor + (foeArmor * .33));
      break;
    case "Can't Hide from Me":
      // Armor Break
      avatar.armor = 0;
      break;
    case "Shadowy Influx":
      // Health Bonus
      foe.health = Math.floor(foe.health + (foe.health * .2));
      break;
    case "Breath Bane":
      // Health Reduction
      avatar.health = Math.floor(avatar.health - (avatar.health * .2));
      break;
    case "Sadistic Siphon":
      // Health Steal
      const foeHealth = foe.health;
      const avatarHealth = avatar.health;
      const stolenHealth =  avatarHealth * .125;

      foe.health = foe.health + stolenHealth;
      avatar.health = avatar.health - stolenHealth;
      break ;
      default:
      break;
  }

  return { foe, avatar };
}


module.exports = { doAvatarBattlePrep, doFoeBattlePrep }