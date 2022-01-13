import HF from "./herofit";

type NodeEnvironments = "development" | "staging" | "production" | "test";

interface ObjectWithAnyProperties {
  [key: string]: any;
}

interface PreBattleObject {
  owner: string;
  avatarID: number;
  avatarName: number;
  foe: GeneratedFoe;
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
}

type VillainJsonStructure = {
  [key in HF.FoeClass]: HF.FoeTemplate[];
};

interface GeneratedFoe {
  air: number;
  fire: number;
  name: string;
  type: HF.FoeType;
  armor: number;
  class: HF.FoeClass;
  earth: number;
  power: number;
  water: number;
  health: number;
  ability: {
    name: string;
    type: EffectType;
    effect: string;
  };
  ptBounty: number;
  xpBounty: number;
  difficulty: number;
}

interface BasicUserContactInfo {
  username: string;
  firstName: string | undefined;
  email: string;
}

interface SpecialEventActionType {
  type: string;
  action: string;
  bonusPercent?: number;
  requirements?: ObjectWithAnyProperties[];
  levelRequirement?: number;
}

interface SpecialEvent {
  eventName: string;
  description: string;
  actionTypes: SpecialEventActionType[];
}

export { NodeEnvironments, ObjectWithAnyProperties, PreBattleObject, BasicUserContactInfo, FoeTemplate, VillainJsonStructure, SpecialEvent };
