import HF from "./herofit";

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

interface SpecialEventActionType {
  type: string;
  action?: string;
  bonusPercent?: number;
  requirements?: ObjectWithAnyProperties[];
  levelRequirement?: number;
  odds?: number;
  foe?: HF.FoeType;
  foeClass?: HF.FoeClass;
  stats?: Lowercase<Exclude<HF.Stat, "Recovery" | "Aether">>[];
  itemID?: number;
}

interface SpecialEvent {
  eventName: string;
  description: string;
  actionTypes: SpecialEventActionType[];
}

export { NodeEnvironments, ObjectWithAnyProperties, PreBattleObject, BasicUserContactInfo, FoeTemplate, FoeStats, VillainJsonStructure, SpecialEvent, SpecialEventActionType };
