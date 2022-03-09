import { Avatar, Battle, AvatarItems, Items } from "../../config/db";
import { Op } from "sequelize";
import { DEFEATEDFOE, WINSTREAK, WINTOTAL } from "../postBattleActions.json";
import VILLAINS from "../villains.json";

// ON GOTOBATTLE, save list of effects from avatar's items
function determineItemEffects(equipment) {
  const reduced = equipment.reduce((filtered, item) => {
    //console.log('itemname', item.name);
    //console.log(item.effects);
    // Item primary effect, push it to array if it exists
    if (item.effects && item.effects.length) {
      // Determine if item effects are battle effects
      // AND map only the effect name
      const battleItemEffects = _filterBattleEffects(item.effects);

      //console.log('', battleItemEffects);
      filtered.push(...battleItemEffects);
    }
    return filtered;
  }, []);

  return reduced.length ? reduced : null;
}

// Filter item effects down to just battle effects and return only their names
function _filterBattleEffects(itemEffects) {
  const battleItemEffects = itemEffects
    .filter(effect => {
      //console.log('EFFECTTT - ', effect);
      return effect.type === "prebattle" || effect.type === "postbattle";
    })
    .map(effect => {
      return effect.name;
    });
  return battleItemEffects;
}

// ON GOTOBATTLE, DETERMINE POST BATTLE ACTIONS
function determinePostBattleActions(avatar, foe, resolve, reject) {
  const PBAs = [];
  return AvatarItems.findAll({
    attributes: ["itemID"],
    where: { avatarID: avatar.id },
    include: [
      {
        model: Items,
        attributes: ["name", "type"],
        where: {
          id: { [Op.col]: "avatar_items.itemID" },
          type: { [Op.not]: "consumable" },
        },
        required: false,
        raw: true,
      },
    ],
    raw: undefined,
    nest: true,
  })
    .then(records => {
      // Filter results by non consumables, and convert dataValues to actual javascript object
      const avatarItems = records
        .filter(record => record.dataValues.item)
        .map(record => {
          const itemID = record.dataValues.itemID;
          const item = record.dataValues.item.dataValues;
          return Object.assign({}, { itemID }, item);
        });
      //console.log('CONVERTED-', avatarItems);
      //Convert avatarItems into a series of different arrays based on type. This is to check if the player has already earned an award.
      const skinNamesArray = avatarItems.filter(item => item.type === "skin").map(skin => skin.name);
      const titleNamesArray = avatarItems.filter(item => item.type === "title").map(title => title.name);
      const petNamesArray = avatarItems.filter(item => item.type === "pet").map(pet => pet.name);
      //console.log('SNA - ',skinNamesArray,'TNA - ', titleNamesArray,'PNA - ', petNamesArray);
      const allPbaCheckPromises = [];

      // Win Totals Check
      allPbaCheckPromises.push(_checkWinTotal(avatar.id, titleNamesArray));

      // Win streak Check
      allPbaCheckPromises.push(_checkWinStreak(avatar.id, titleNamesArray));

      // Spirits get a skin if they defeat all of a particular type
      if (foe.class === "Spirits") {
        // Check if current foe is last of type of foe
        allPbaCheckPromises.push(_checkDefeatedAllOfTypeButCurrent(avatar.id, foe.type, "Spirits", foe.name, skinNamesArray));
      }

      if (foe.class === "Titans") {
        if (VILLAINS.Titans.map(foe => foe.type).includes(foe.type)) {
          const allPastRewards = [...skinNamesArray, ...titleNamesArray, ...petNamesArray];
          // Check if foe has been defeated
          allPbaCheckPromises.push(_checkDefeatedParticularFoe(avatar.id, foe.type, "Titans", foe.name, allPastRewards));
        }
      }

      if (foe.class === "Elementals") {
        const minorFoes = ["Gusty Rascal", "Rock Skipper", "Flame Fiend", "Splash Artist"];
        const midLevelFoes = ["Wheezing Jinn", "Granite Golem", "Burning Jinn", "Cyclonic Siren"];
        const highLevelFoes = ["Storming Oni", "Hulking Aggro Crag", "Scorching Archfiend", "High Priestess of the Tides"];

        if (minorFoes.includes(foe.type)) {
          // Check if current foe is last of type of foe
          allPbaCheckPromises.push(_checkDefeatedAllOfTypeButCurrent(avatar.id, foe.type, "Elementals", foe.name, petNamesArray));
        } else if (midLevelFoes.includes(foe.type)) {
          // Check if current foe is last of type of foe
          allPbaCheckPromises.push(_checkDefeatedAllOfTypeButCurrent(avatar.id, foe.type, "Elementals", foe.name, titleNamesArray));
        } else if (highLevelFoes.includes(foe.type)) {
          // Check if current foe is last of type of foe
          allPbaCheckPromises.push(_checkDefeatedAllOfTypeButCurrent(avatar.id, foe.type, "Elementals", foe.name, skinNamesArray));
        }
      }

      return Promise.allSettled(allPbaCheckPromises)
        .then(resolvedPromises => {
          const totalCheck = resolvedPromises[0];
          const streakCheck = resolvedPromises[1];
          const defeatFoeCheck = resolvedPromises[2];

          // results from resolved promises
          const winTotalAction = totalCheck ? totalCheck.value : null;
          const winStreakAction = streakCheck ? streakCheck.value : null;
          const defeatFoeAction = defeatFoeCheck ? defeatFoeCheck.value : null;

          // 1 - WIN TOTAL AWARD PBA
          if (winTotalAction) {
            PBAs.push(winTotalAction);
          }

          // 2 - STREAK TITLE AWARD PBA
          if (winStreakAction) {
            PBAs.push(winStreakAction);
          }

          // 3 - SKIN AWARD PBA
          if (defeatFoeAction) {
            PBAs.push(defeatFoeAction);
          }

          // ALL PBAs as action strings in an array
          resolve(PBAs);
        })
        .catch(err => {
          console.log("err", err);
          reject(err);
        });
    })
    .catch(error => {
      console.log("Error Getting all titles", error);
      return reject(error);
    });
}

// CHECKS IF THE CURRENT FOE WILL GRANT A REWARD
function _checkDefeatedParticularFoe(avatarId, foeType, foeClass, currentFoeName, arrayOfPastRewards) {
  // FIND ALL BATTLES WHERE THE AVATAR WON AND WHERE THE FOE MATCHES THE FOETYPE PASSED IN
  return Battle.findAll({
    attributes: ["foe"],
    where: {
      avatarID: avatarId,
      [Op.or]: [{ outcome: "Avatar Wins" }],
      "foe.type": { [Op.eq]: foeType },
    },
    raw: true,
  })
    .then(results => {
      // All foes defeated within a type (eg. Banshee)
      if (results) {
        // From resulting battles, make an array that's only the names of the foes. Then sort it in alphabetical order
        const foesDefeated = results
          .map(result => result.foe.name)
          .slice()
          .sort();

        // Remove duplicates from foesDefeated
        const fdNoDUpes = [...new Set(foesDefeated)];

        const hasBeenDefeated = fdNoDUpes.includes(currentFoeName) ? true : false;
        //console.log('hasBeenDefeated', hasBeenDefeated);
        // If last foe of type, return matching PBA action
        if (!hasBeenDefeated) {
          // Consider moving the PBA action to the normal PBA JSON file
          const action = VILLAINS[foeClass].find(f => f.type === foeType).pba[0];
          const matchingPBA = DEFEATEDFOE.find(pba => pba.action === action);
          //console.log('action', action, 'MPBA - ', matchingPBA);
          // Check to make sure the user doesn't already have the item
          const isCriticalWin = !arrayOfPastRewards.includes(matchingPBA.name);

          // Win is critical if it's unearned
          if (isCriticalWin) {
            //console.log('IS A CRITICAL WIN', isCriticalWin);
            return action;
          }
          return undefined;
        }
        return undefined;
      }
      // THIS SHOULDN'T HAPPEN, BUT I WANT TO PREVENT THE SCRIPT FROM STALLING IF IT DOES
      return undefined;
    })
    .catch(error => {
      console.log("ERR - ", error);
    });
}

// CHECKS IF THE CURRENT FOE WILL GRANT A NEW SKIN FOR BEING LAST OF TYPE
function _checkDefeatedAllOfTypeButCurrent(avatarId, foeType, foeClass, currentFoeName, itemTypeNamesArray) {
  // FIND ALL BATTLES WHERE THE AVATAR WON or DKO AND WHERE THE FOE MATCHES THE FOETYPE PASSED IN
  return Battle.findAll({
    attributes: ["foe"],
    where: {
      avatarID: avatarId,
      [Op.or]: [{ outcome: "Avatar Wins" }, { outcome: "Double KO" }],
      "foe.type": { [Op.eq]: foeType },
    },
    raw: true,
  })
    .then(results => {
      // All foes defeated within a type (eg. Banshee)
      if (results) {
        // From resulting battles, make an array that's only the names of the foes. Then sort it in alphabetical order
        const foesDefeated = results
          .map(result => {
            // Need to check for Shadow-Self instead of Shadow-Grabbler
            const foeName = result.foe.type === "Shadow-Self" ? "Shadow-Self" : result.foe.name;
            return foeName;
          })
          .slice()
          .sort();

        // Remove duplicates from foesDefeated
        const fdNoDUpes = [...new Set(foesDefeated)];
        //console.log('NO DUPES-', fdNoDUpes);
        // All foes of a certain type
        const allFoes = VILLAINS[foeClass]
          .find(foe => foe.type === foeType)
          .foe.slice()
          .sort();
        //console.log('AF',allFoes);

        // IF THERE IS ONLY ONE NAME MISSING FROM allFoes AND ITS THE CURRENT FOE
        // GOAL of this code is to determine if this exact foe name is the final name of a type that HAS NOT been defeated
        // IF SO, we want to assign a postBattleAction that will award the user if they win the battle

        // Need to handle Shadow foe differently
        if (currentFoeName.includes("Shadow")) {
          const currentFoeName = "Shadow-Self";
          // If Shadow self was already defeated, or f user already has the Shadow Self Skin, just return undefined
          if (fdNoDUpes.includes("Shadow-Self") || itemTypeNamesArray.includes("Shadow Self")) {
            return undefined;
            // If Shadow-Self wasn't defeated, then add the GRANT Shadow-Self award
          } else {
            return VILLAINS["Spirits"].find(f => f.type === "Shadow-Self").pba[0];
          }
          // ANY OTHER FOE
        } else {
          //console.log('CN = ', currentFoeName);
          // Make an array of all foes of type EXCLUDING the name of the current foe
          const allFoesMinusCurrent = allFoes.filter(foe => foe !== currentFoeName);
          //console.log('AFMC', allFoesMinusCurrent);
          //console.log('the two arrays',allFoesMinusCurrent, fdNoDUpes);
          // Compare the previous array to the deduped foes defeated array
          const isLastOfType = allFoesMinusCurrent.every((val, i) => {
            return val === fdNoDUpes[i];
          });
          //console.log('isLastOfType', isLastOfType);
          // If last foe of type, return matching PBA action
          if (isLastOfType) {
            // Consider moving the PBA action to the normal PBA JSON file
            const action = VILLAINS[foeClass].find(f => f.type === foeType).pba[0];
            const matchingPBA = DEFEATEDFOE.find(pba => pba.action === action);
            //console.log('action', action, 'MPBA - ', matchingPBA);
            // Skin should never be owned and make it this far, but check to make sure the user doesn't already have the skin
            const isCriticalWin = !itemTypeNamesArray.includes(matchingPBA.name);
            //console.log('IS CRITICAL WIN', isCriticalWin);
            // Win is critical if it's unearned
            if (isCriticalWin) {
              return action;
            }
            return undefined;
          }
          return undefined;
        }
      }
      // THIS SHOULDN'T HAPPEN, BUT I WANT TO PREVENT THE SCRIPT FROM STALLING IF IT DOES
      return undefined;
    })
    .catch(error => {
      console.log("ERR - ", error);
    });
}

// CHECKS FOR WIN STREAK
function _checkWinStreak(avatarId, titleNamesArray) {
  // Get latest 35 battles
  return Battle.findAll({
    attributes: ["outcome"],
    where: { avatarID: avatarId, outcome: { [Op.ne]: "TBD" } },
    limit: 50,
    order: [["createdAt", "DESC"]],
    raw: true,
  })
    .then(results => {
      let streak = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i].outcome === "Avatar Wins") {
          streak += 1;
        } else {
          break;
        }
      }

      // Current streak that Avatar will have if it wins tonight
      const streakIfWin = streak + 1;

      // Need to find the streak that matches a pba requirement, if one exists
      const matchingPBA = WINSTREAK.find(pba => pba.requirement === streakIfWin);

      // If with a win tonight, the pba name matches a streak in the items file
      // If a match
      if (matchingPBA) {
        // Win is critical if it's unearned
        const isCriticalWin = !titleNamesArray.includes(matchingPBA.name);

        //Add to PBAs if critical
        if (isCriticalWin) {
          return matchingPBA.action;
        }
      }
    })
    .catch(error => {
      console.log("Error getting win streak - ", error);
    });
}

// CHECKS FOR WIN TOTAL
function _checkWinTotal(avatarId, titleNamesArray) {
  return Avatar.find({
    attributes: ["battleWins"],
    where: { id: avatarId },
    raw: true,
  })
    .then(({ battleWins }) => {
      const battleWinsIfWinTonight = battleWins + 1;
      // Check if the potential win total will match a new PBA
      const matchingPBA = WINTOTAL.find(pba => pba.requirement === battleWinsIfWinTonight);
      //console.log('TOTAL IF WIN -', battleWinsIfWinTonight, 'MAA-',matchingPBA);
      // If this win matches a new PBA
      if (matchingPBA) {
        // Win is critical if it's unearned
        // Should theoretically never be i this array, but just incase to prevent duplicate titles
        const isCriticalWin = !titleNamesArray.includes(matchingPBA.name);
        //console.log(isCriticalWin, titleNamesArray);
        //Add to PBAs if critical
        if (isCriticalWin) {
          return matchingPBA.action;
        }
      }
    })
    .catch(error => {
      console.log("Error getting battle wins - ", error);
    });
}

export { determineItemEffects, determinePostBattleActions };
