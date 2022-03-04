import HF from "./herofit";
import { Request, Response } from "express";
import { Express } from "@sentry/tracing/dist/integrations";

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
  id: number;
  user: string;
  avatarId: string;
  lastUpdate: string;
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

export { NodeEnvironments, ObjectWithAnyProperties, PreBattleObject, BasicUserContactInfo, PossibleFoeStat, FoeTemplate, FoeStats, VillainJsonStructure, SpecialEvent, SpecialEventActionType, StravaUpdateObj, TypedRequestBody, UserTotals };
