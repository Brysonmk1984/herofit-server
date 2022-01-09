import { BasicUserContactInfo, NodeEnvironments, ObjectWithAnyProperties } from "./BackendOnlyTypes";
import HF from "./herofit";

// This includes function takes the ReadonlyArray<T> as an argument, and searches for an element that is of type U. We check through our generic bounds that T extends U, which means that U is a superset of T (or T is a subset of U). If the method returns true, we can say for sure that el is of the narrower type U.
function includes<T extends U, U>(coll: ReadonlyArray<T>, el: U): el is T {
  return coll.includes(el as T);
}

// Check to make sure it's a user object
function isActiveUser(user: any): user is HF.User {
  console.log("user info", user);
  return user.hasOwnProperty("id") && user?.active === true;
}

function includesBasicUserInfo(userInfo: ObjectWithAnyProperties | string): userInfo is BasicUserContactInfo {
  if (userInfo.hasOwnProperty("username") && userInfo.hasOwnProperty("email")) {
    return true;
  }
  return false;
}

export { includes, isActiveUser, includesBasicUserInfo };
