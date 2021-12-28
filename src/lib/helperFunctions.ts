interface ObjectWithAnyProperties {
  [key: string]: any;
}
function cloneObj(obj: ObjectWithAnyProperties, deep = false) {
  var result: ObjectWithAnyProperties = {};
  for (let key in obj) {
    if (deep && obj[key] instanceof Object) {
      if (obj[key] instanceof Array) {
        result[key] = [];
        obj[key].forEach(function (item: unknown) {
          if (item instanceof Object) {
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
  return result;
}

const shuffleArray = function (array: any[]) {
  var currentIndex: number = array.length,
    temporaryValue: number,
    randomIndex: number;

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
};



module.exports = {
  cloneObj,

};
