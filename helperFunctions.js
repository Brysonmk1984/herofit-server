
function parseAvatarProperties(avatar){
   const attrsToBeParsed = ['fire', 'earth', 'air', 'water', 'armor', 'recovery'];
   let toBeParsed;
   for(let attr in avatar){
      toBeParsed = attrsToBeParsed.includes(attr);
      if(toBeParsed){
         avatar[attr] = JSON.parse(avatar[attr]);
      }
   }
   return avatar;
}

function cloneObj(obj, deep=false){
  var result = {};
  for(let key in obj){
    if(deep && obj[key] instanceof Object){
       if(obj[key] instanceof Array){
         result[key] = [];
         obj[key].forEach(function(item){
            if(item instanceof Object){
               result[key].push(cloneObj(item, true));
            } else {
               result[key].push(item);
            }
         });
       } else {
         result[key] = cloneObj(obj[key]);
       }
    } else {
       result[key] = obj[key];
    }
  }
  return result
}

function arrayChunker(inputArray, perChunk){   

   var result = inputArray.reduce((resultArray, item, index) => { 
   const chunkIndex = Math.floor(index/perChunk)

   if(!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [] // start a new chunk
   }

   resultArray[chunkIndex].push(item)

   return resultArray
   }, [])

   return result;
   
}

function adjustActivityMinutes(minutes, activityType, timeAndHalfActivities){
   const isTimeAndHalf =  timeAndHalfActivities.includes(activityType);
   if(isTimeAndHalf){
      return minutes * 1.5;
   }
   return minutes;
}

module.exports = { cloneObj, parseAvatarProperties, arrayChunker, adjustActivityMinutes };