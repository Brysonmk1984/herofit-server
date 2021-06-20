const { Avatar } = require('../../config/db');
const { Op } = require("sequelize");
const { arrayChunker, roundNumber } = require('../../lib/helperFunctions');
const battleProcess = require('./battleProcess');
const { sendBattleReportEmail } = require('../../mail');

// Takes a group of bandles and runs them through the universal battleProcess
function _runBattlesOnBatch(shard, shardIndex){
  const allAvatarIds = shard.map(battle => battle.avatarID);
 
  return Avatar.findAll({
    where : { id : { [Op.in] : allAvatarIds }},
    raw : true,
    attributes: ['id','name','character', 'qp', 'health','power','armor','fire','air','water','earth','status', 'activityXP', 'battleXP', 'battleWins','battleLosses','battleDraws', 'battleDkos', 'photonTokens']
  }).then((avatars) =>{
    // Reorder of avatars is the same as the shard's order
    avatars.sort((a, b) => {  
      return allAvatarIds.indexOf(a.id) - allAvatarIds.indexOf(b.id);
    });

    let battlePromises = []
    for(let i=0; i< shard.length; i++){
      battlePromises.push(battleProcess(shard[i], avatars[i]));
    }
    return Promise.allSettled(battlePromises);
  }).catch((error) =>{
    console.log('ERROR RUNNING battlePromises', error);
    return error;
  });

}


// BREAK BATTLES INTO SHARDS, THEN runBattlesOnBatch ON ALL SHARDS
function runAllBattles(battles, sendReport){
  // Need to divide records into groups of 9
  battleShards = arrayChunker(battles, 9);

  const allBattleShardPromises = [];
  //RUN BATTLES ON BATCH
  for(let i = 0; i < battleShards.length; i++){
    allBattleShardPromises.push( _runBattlesOnBatch(battleShards[i], i));
  }
  return Promise.allSettled(allBattleShardPromises)
  .then((result)=>{
    // If there's an error in the battle processing, throw error before trying to calculate totals
    if(result.length && result[0].value instanceof Error){
      throw result[0].value;
    }
    const allOutcomes = result.map(promiseResult => promiseResult.value.map(innerPr => innerPr.value))
    const outcomeList = [].concat.apply([], allOutcomes);

    const tally= { 'Avatar Wins' : 0, 'Foe Wins' : 0, 'Draw' : 0, 'Double KO' : 0, total : 0, avWinPercent : 0, avWinPercentOverall : 0, tiePercent : 0 };

    outcomeList.forEach((outcome, i) =>{
      tally[outcome] += 1;
      tally.total +=1;

      // If last outcome, compute totals
      if(i + 1 === outcomeList.length){
        tally.avWinPercent = `${roundNumber((tally['Avatar Wins'] / (tally['Avatar Wins'] + tally['Foe Wins'])), 2) * 100}%`;
        tally.avWinPercentOverall = `${roundNumber((tally['Avatar Wins'] / tally.total), 2) * 100}%`;
        const ties = tally['Draw'] + tally['Double KO'];
        tally.tiePercent = `${roundNumber((ties / tally.total), 2) * 100}%`;
      }
    });
    // Return battle results tally to be emailed
    return tally;
  })
  // TALLY UP THE RESULTS AND SEND EMAIL
  .then((results) => {
    console.log('tally', results);
    if(sendReport){
      return sendBattleReportEmail(results)
      .then((data) =>{
        console.log('Result Tally email sent successfully',data);
        return data;
      }).catch((error) =>{
        console.log('ERROR Sending Battle Report email', error);
        return error;
      });
    }
    return results;
  }).catch((error) =>{
    console.log('ERROR RUNNING ALL BATTLES', error);
    return error;
  });
}

module.exports = runAllBattles;