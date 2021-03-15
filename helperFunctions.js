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

const shuffleArray = function(array) {
   var currentIndex = array.length, temporaryValue, randomIndex;
 
   // While there remain elements to shuffle...
   while (0 !== currentIndex) {
 
     // Pick a remaining element...
     randomIndex = Math.floor(Math.random() * currentIndex);
     currentIndex -= 1;
 
     // And swap it with the current element.
     temporaryValue = array[currentIndex];
     array[currentIndex] = array[randomIndex];
     array[randomIndex] = temporaryValue;
   }
 
   return array;
 }

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

function getRandomNumber(length) {
   return Math.floor(Math.pow(10, length-1) + Math.random() * 9 * Math.pow(10, length-1));
}

module.exports = { cloneObj, shuffleArray, parseAvatarProperties, arrayChunker, getRandomNumber };