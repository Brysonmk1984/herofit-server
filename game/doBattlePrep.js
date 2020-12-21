
function doAvatarBattlePrep(avatar, foe, itemsUsed, actionsChosen){

  return { avatar, foe };
}

function doFoeBattlePrep(foe, avatar, itemsUsed, actionsChosen){

  switch(actionsChosen.name){
    case "From the Shadows":
      // Increased Power
      foe.power = Math.floor(foe.power + (foe.power * .2));
      break;
    case "Intimidation":
      // Power Reduction
      avatar.power = Math.floor(avatar.power - (avatar.power * .2));
      break;
    case "Unseen Swap":
      // Power Trade
      const foePower = foe.power;
      const avatarPower = avatar.power;
      foe.power = avatarPower;
      avatar.power = foePower;
      break;
    case "Armor Barter":
      // Armor Trade
      const foeArmor = foe.armor;
      const avatarArmor = avatar.armor;
      foe.armor = avatarArmor;
      avatar.armor = foeArmor;
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