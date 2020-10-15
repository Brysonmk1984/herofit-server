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

module.exports = { cloneObj };