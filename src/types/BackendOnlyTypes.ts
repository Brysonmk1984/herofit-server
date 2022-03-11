import HF from "./herofit";
import { Request, Response } from "express";

type NodeEnvironments = "development" | "staging" | "production" | "test";

interface ObjectWithAnyProperties {
  [key: string]: any;
}

interface PreBattleObject {
  owner: string;
  avatarID: number;
  avatarName: number;
  foe: HF.Foe;
  foeType: HF.FoeType;
  avatar: HF.Hero;
  outcome: "TBD";
  seenReport: false;
}

type EffectType = "prebattle" | "postbattle";

interface FoeTemplate {
  class: HF.FoeClass;
  type: HF.FoeType;
  difficultyLevel: "low" | "medium" | "high";
  foe: string[];
  ability: {
    name: string;
    effect: string;
    type: "prebattle" | "postbattle";
  };
  color: string;
  pba: string[];
  reward: {
    type: HF.ServerItemType;
    name: string;
  };
  itemSummonOnly: boolean;
  levelRequirement: number;
  bonusXpBase?: number;
  bonusPtBase?: number;
}

interface FoeStats {
  health: number;
  power: number;
  armor: number;
  fire: number;
  earth: number;
  water: number;
  air: number;
  qp: number;
  difficulty: number;
}

type VillainJsonStructure = {
  [key in HF.FoeClass]: FoeTemplate[];
};

interface BasicUserContactInfo {
  username: string;
  firstName: string | undefined;
  email: string;
}

type PossibleFoeStat = Lowercase<Exclude<HF.Stat, "Recovery" | "Aether">>;

interface SpecialEventActionType {
  type: string;
  action?: string;
  bonusPercent?: number;
  requirements?: ObjectWithAnyProperties[];
  levelRequirement?: number;
  odds?: number;
  foe?: HF.FoeType;
  foeClass?: HF.FoeClass;
  stats?: PossibleFoeStat[];
  itemID?: number;
  items?: string[];
}

interface SpecialEvent {
  eventName: string;
  description: string;
  actionTypes: SpecialEventActionType[];
}

interface StravaUpdateObj {
  stravaAccessToken: string;
  stravaAccessTokenExpiration: number;
  stravaRefreshToken: string;
  dataSrcId?: string;
}

interface TypedRequestBody<T> extends Request {
  body: T;
}

interface ActivityTotal {
  duration: number;
  instance: number;
}
type ActivityTotalOrNull = ActivityTotal | null;

interface UserTotals {
  run: ActivityTotalOrNull;
  hike: ActivityTotalOrNull;
  walk: ActivityTotalOrNull;
  ride: ActivityTotalOrNull;
  swim: ActivityTotalOrNull;
  yoga: ActivityTotalOrNull;
  weightTraining: ActivityTotalOrNull;
  stairStepper: ActivityTotalOrNull;
  elliptical: ActivityTotalOrNull;
  standUpPaddling: ActivityTotalOrNull;
  crossfit: ActivityTotalOrNull;
  rowing: ActivityTotalOrNull;
  ski: ActivityTotalOrNull;
  snowboard: ActivityTotalOrNull;
  snowshoe: ActivityTotalOrNull;
  kayaking: ActivityTotalOrNull;
  workout: ActivityTotalOrNull;
}

interface BackendUserTotals extends UserTotals {
  id: number;
  user: string;
  avatarId: string;
  lastUpdate: string;
}

type ActivityType = "run" | "hike" | "walk" | "ride" | "swim" | "yoga" | "weightTraining" | "stairStepper" | "elliptical" | "standUpPaddling" | "crossfit" | "rowing" | "ski" | "snowboard" | "snowshoe" | "kayaking" | "workout";

type PBAType = "Award Skin" | "Award Title" | "Award Pet";
type PBAItemCategory = HF.Pluralize<HF.ServerItemType>;

interface DefeateFoePBA {
  action: string;
  name: string;
  type: PBAType;
  itemCategory: PBAItemCategory;
  outcome: "Avatar Wins" | "Double KO"[];
}

interface WinStreakPBA {
  requirement: number;
  action: string;
  name: string;
  type: PBAType;
  itemCategory: PBAItemCategory;
  outcome: "Avatar Wins"[];
}

interface WinTotalPBA {
  requirement: number;
  action: string;
  name: string;
  type: PBAType;
  itemCategory: PBAItemCategory;
  outcome: "Avatar Wins"[];
}

interface HelperPBA {
  requirement: null;
  action: null;
  name: string;
  type: PBAType;
  itemCategory: PBAItemCategory;
  outcome: null;
}

interface PostBattleActions {
  DEFEATEDFOE: DefeateFoePBA[];
  WINSTREAK: WinStreakPBA[];
  WINTOTAL: WinTotalPBA[];
  HELPER: HelperPBA[];
}
type ActionTypeNames = keyof PostBattleActions;

type AllPbaTypes = DefeateFoePBA | WinStreakPBA | WinTotalPBA | HelperPBA;

interface BackendBattle {
  owner: string;
  avatarID: number;
  avatarName: string;
  foe: HF.Foe;
  foeType: string;
  avatar: HF.Hero;
  outcome: HF.BattleOutcome | "TBD";
  seenReport: boolean;
  postBattleActions: PBAType[] | null;
  effects: string[] | null;
}

interface BackendAvatarItems {
  id: number;
  avatarID: number;
  itemID: number;
  equipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export { NodeEnvironments, ObjectWithAnyProperties, PreBattleObject, BasicUserContactInfo, PossibleFoeStat, FoeTemplate, FoeStats, VillainJsonStructure, SpecialEvent, SpecialEventActionType, StravaUpdateObj, TypedRequestBody, UserTotals, BackendUserTotals, ActivityType, PBAType, PostBattleActions, AllPbaTypes, BackendBattle, ActionTypeNames, BackendAvatarItems };
