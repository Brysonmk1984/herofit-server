const { arrayChunker, roundNumber, parseAvatarProperties } = require("../../lib/helperFunctions");
const battleProcess = require("./battleProcess");
const { sendBattleReportEmail } = require("../../mail");

const BATCH_CHUNK = 12;
const BATCH_TIMEOUT = 2000;

// TAKES A GROUP OF BATTLES AND RUNS THEM THROUGH THE UNIVERSAL BATTLE PROCESS
function _runBattlesOnBatch(shard) {
  try{
    const allAvatars = shard.map(battle => battle.avatar);

    let battlePromises = [];
    for (let i = 0; i < shard.length; i++) {
      battlePromises.push(battleProcess(shard[i], parseAvatarProperties(allAvatars[i])));
    }
    return Promise.allSettled(battlePromises);
  }catch(error){
    throw error;
  }
}

// BREAK BATTLES INTO SHARDS, THEN runBattlesOnBatch ON ALL SHARDS
async function runAllBattles(battles, sendReport) {
  const allBattleShardPromises = [];
  let i = 0;

  // Need to divide records into groups of 9
  const battleShards = arrayChunker(battles, BATCH_CHUNK);

  // Currently needed to work around the connection limit error on Heroku Postgres
  function staggerBattleBatches(resolve, reject) {
    // Delay each shard by BATCH_TIMEOUT (12) seconds for now
    setTimeout(() => {
      try {
        allBattleShardPromises.push(_runBattlesOnBatch(battleShards[i]));
        i++;
        // As long as  it's not the last shard, recursively call staggerBattleBatches
        if (i < battleShards.length) {
          return staggerBattleBatches(resolve, reject);
        }
        resolve(Promise.allSettled(allBattleShardPromises));
      } catch (error) {
        reject(error);
      }
    }, BATCH_TIMEOUT);
  }

  try {
    const battlesResults = await new Promise((resolve, reject) => staggerBattleBatches(resolve, reject));
    console.log("ALL BATTLE SHARDS RAN!", battlesResults);

    // If there's an error in the battle processing, throw error before trying to calculate totals
    if (battlesResults.length && battlesResults[0].value instanceof Error) {
      throw battlesResults[0].value;
    }
    const allOutcomes = battlesResults.map(promiseResult => promiseResult.value.map(innerPr => innerPr.value));
    const outcomeList = [].concat.apply([], allOutcomes);
    const tally = {
      "Avatar Wins": 0,
      "Foe Wins": 0,
      Draw: 0,
      "Double KO": 0,
      total: 0,
      avWinPercent: 0,
      avWinPercentOverall: 0,
      tiePercent: 0,
    };

    outcomeList.forEach((outcome, i) => {
      tally[outcome] += 1;
      tally.total += 1;

      // If last outcome, compute totals
      if (i + 1 === outcomeList.length) {
        tally.avWinPercent = `${roundNumber(tally["Avatar Wins"] / (tally["Avatar Wins"] + tally["Foe Wins"]), 2) * 100}%`;
        tally.avWinPercentOverall = `${roundNumber(tally["Avatar Wins"] / tally.total, 2) * 100}%`;
        const ties = tally["Draw"] + tally["Double KO"];
        tally.tiePercent = `${roundNumber(ties / tally.total, 2) * 100}%`;
      }
    });
    tally.failedToRun = tally.total - (tally["Avatar Wins"] + tally["Foe Wins"] + tally["Draw"] + tally["Double KO"]);
    // Return battle results tally to be emailed

    // TALLY UP THE RESULTS AND SEND EMAIL

    //console.log("tally", tally);
    if (sendReport && tally.total > 0) {
      try {
        const data = await sendBattleReportEmail(tally);
        console.log("Result Tally email sent successfully", data);
        return data;
      } catch (error) {
        console.log("ERROR Sending Battle Report email", error);
        throw error;
      }
    }
    return tally;
  } catch (error) {
    console.log("ERROR RUNNING ALL BATTLES", error);
    throw error;
  }
}

module.exports = runAllBattles;
