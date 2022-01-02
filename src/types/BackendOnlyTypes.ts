import HF from "./herofit";

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

export { ObjectWithAnyProperties, PreBattleObject };
