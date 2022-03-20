import * as moment from "moment";
declare namespace HF {
  type Pluralize<T extends string> = `${T}s`;
  type ActionType = "TOGGLE LOADING" | "TOGGLE IN APP LOADING" | "SET EXISTING USER INIT DATA" | "SET ISSIGNEDIN" | "SET NEW USER" | "SET HERO" | "SET USER" | "RESET DEFAULTS" | "POST UPGRADE" | "SEEN BATTLE REPORT" | "UPDATE INVENTORY" | "UPDATE EQUIPPED" | "UPDATE LATEST BATTLE" | "SET INITIAL HOMESCREEN LOAD" | "SET BACKGROUND" | "SET JWT" | "SET ACTIVITY RECHECK HAPPENED" | "INCREMENT REFRESH COUNT";
  interface ToggleLoadingAction {
    type: "TOGGLE LOADING";
    payload: {
      isLoading: boolean;
    };
  }
  interface ToggleInAppLoadingAction {
    type: "TOGGLE IN APP LOADING";
    payload: {
      isLoadingInApp: boolean;
    };
  }
  interface SetExistingUserInitDataAction {
    type: "SET EXISTING USER INIT DATA";
    payload: {
      globalMessages: GlobalMessages | undefined;
      user: User;
      hero: Hero;
      latestSavedActivities: Activity[];
      latestSavedActivityDate: string | null;
      latestBattle: Battle;
      isSignedIn: boolean;
      allGameItems: Item[];
      awardedItemMessage: string | null;
    };
  }
  interface SetIsSignedInAction {
    type: "SET ISSIGNEDIN";
    payload: {
      isSignedIn: boolean;
      initialHomescreenLoad?: "Home" | "Register" | null;
    };
  }
  interface SetUserStatusAction {
    type: "SET USER STATUS";
    payload: {
      userStatus: UserStatus;
    };
  }
  interface SetHeroAction {
    type: "SET HERO";
    payload: {
      hero: Hero | (HeroWithStats & DefaultHeroProperties);
    };
  }
  interface SetUserAction {
    type: "SET USER";
    payload: {
      user: User;
      isSignedIn?: boolean;
    };
  }
  interface ResetDefaultsAction {
    type: "RESET DEFAULTS";
  }
  interface AddModalAction {
    type: "ADD MODAL";
    payload: {
      id: string;
    };
  }
  interface RemoveModalAction {
    type: "REMOVE MODAL";
    payload: {
      id: string;
    };
  }
  interface PostUpgradeAction {
    type: "POST UPGRADE";
    payload: {
      hero: Hero;
      latestSavedActivities: Activity[];
      latestSavedActivityDate: moment.Moment;
    };
  }
  interface SeenBattleReportAction {
    type: "SEEN BATTLE REPORT";
    payload: {
      latestBattle: Battle;
    };
  }
  interface UpdateInventoryAction {
    type: "UPDATE INVENTORY";
    payload: {
      inventory: {
        pets: Item[];
        consumables: Item[];
        skins: Item[];
        titles: Item[];
        codices: Item[];
      };
    };
  }
  interface UpdateEquippedAction {
    type: "UPDATE EQUIPPED";
    payload: {
      equipped: {
        pet: Item | null;
        skin: Item | null;
        title: Item | null;
      };
    };
  }
  interface UpdateLatestBattleAction {
    type: "UPDATE LATEST BATTLE";
    payload: {
      latestBattle: Battle;
    };
  }
  interface SetInitialHomescreenLoadAction {
    type: "SET INITIAL HOMESCREEN LOAD";
    payload: {
      initialHomescreenLoad: "Home" | "Register" | null;
    };
  }
  interface SetBackgroundAction {
    type: "SET BACKGROUND";
    payload: {
      background: string;
    };
  }
  interface SetJwtAction {
    type: "SET JWT";
    payload: {
      jwt: string | null;
    };
  }
  interface SetActivityRecheckHappened {
    type: "SET ACTIVITY RECHECK HAPPENED";
    payload: {
      activityRecheckHappened: boolean;
    };
  }
  interface SetUpdateLatestActivities {
    type: "UPDATE LATEST ACTIVITIES";
    payload: {
      latestSavedActivities: Activity[];
      latestSavedActivityDate: string;
    };
  }
  interface IncrementRefreshCount {
    type: "INCREMENT REFRESH COUNT";
  }
  type AppAction = ToggleLoadingAction | ToggleInAppLoadingAction | SetExistingUserInitDataAction | SetIsSignedInAction | SetUserStatusAction | SetHeroAction | SetUserAction | ResetDefaultsAction | AddModalAction | RemoveModalAction | PostUpgradeAction | SeenBattleReportAction | UpdateInventoryAction | UpdateEquippedAction | UpdateLatestBattleAction | SetInitialHomescreenLoadAction | SetBackgroundAction | SetJwtAction | SetActivityRecheckHappened | SetUpdateLatestActivities | IncrementRefreshCount;
  type AppDispatch = (action: AppAction) => void;
  interface Action<Payload = {}> {
    type: ActionType;
    payload: Payload;
  }
  type UserStatus = "new" | "unconfirmed" | "active";
  interface Activity {
    activityDate: string;
    averageSpeed: number;
    duration: number;
    distance: number;
    elevationGain: number;
    BackendActivity;
    id: number;
    maxSpeed: number;
    source: string;
    type: string;
  }
  interface InitialAppState {
    globalMessages: GlobalMessages | undefined;
    jwt: string | null;
    isSignedIn: boolean;
    isLoading: boolean;
    isLoadingInApp: boolean;
    userStatus: UserStatus;
    user: User | null;
    hero: Hero | (HeroWithStats & DefaultHeroProperties) | null;
    latestSavedActivities: Activity[];
    latestSavedActivityDate: string | null;
    latestBattle: Battle | null;
    modalQueue: string[];
    allGameItems: Item[];
    inventory: {
      skins: Item[];
      pets: Item[];
      titles: Item[];
      consumables: Item[];
      codices: Item[];
    };
    equipped: {
      skin: Item | null;
      pet: Item | null;
      title: Item | null;
    };
    initialHomescreenLoad: "Home" | "Register" | null;
    background: string;
    awardedItemMessage: string | null;
    activityRecheckHappened: boolean;
    refreshCount: number;
  }
  interface Store {
    state: InitialAppState;
    dispatch: <Payload = {}>(action: Action<Payload>) => void;
  }
  interface User {
    id: number;
    createdAt: string;
    username: string;
    email: string;
    firstName: string;
    isFake: boolean;
    latestActivityUpdate: string;
    stravaAccessToken: string;
    stravaAccessTokenExpiration: number;
    stravaRefreshToken: string;
    featurePreferenceSubmitted: boolean;
    seenLatestPatch: boolean;
    hash: string;
    salt: string;
    active: boolean;
    emailCode: string;
    dataSrcId: string;
    emailMarketingOptIn: boolean;
    updatedAt: string;
    isMetric: boolean;
    foundOutBy: string;
  }
  interface Stats {
    qp: number;
    power: number;
    health: number;
    armor: number;
    recovery: number;
    fire: number;
    earth: number;
    water: number;
    air: number;
    aether: number;
    qpPower: number;
    qpHealth: number;
    qpArmor: number;
    qpRecovery: number;
    qpFire: number;
    qpEarth: number;
    qpAir: number;
    qpWater: number;
    qpAether: number;
  }
  interface HeroTemplate {
    name: string;
    character: CharacterName;
    alias: CharacterAlias;
    colors: [string, string];
  }
  type HeroStatus = "Rested" | "Recovering" | "Knocked Out" | "Infected";
  interface DefaultHeroProperties {
    status: HeroStatus;
    statusFade: number;
    equipped: Item[];
    goToBattle: boolean;
    restedEnough: boolean;
    healthRegenRate: number;
    photonTokens: number;
    activityXP: number;
    battleXP: number;
    level: number;
    albedo: number | null;
    thisLevelStartXp: number;
    nextLevelStartXp: number;
    battleDkos: number;
    battleDraws: number;
    battleLosses: number;
    battleWins: number;
    maxHealth: number;
    hasBeenUpgraded: boolean;
  }
  interface HeroWithStats extends DefaultHeroProperties, HeroTemplate {
    power: number;
    health: number;
    armor: number;
    recovery: number;
    fire: number;
    earth: number;
    water: number;
    air: number;
    aether: number;
    qp: number;
    qpPower: number;
    qpHealth: number;
    qpArmor: number;
    qpRecovery: number;
    qpFire: number;
    qpEarth: number;
    qpAir: number;
    qpWater: number;
    qpAether: number;
  }
  type ExistingHeroPropertiesAsUnion = "owner" | "id" | "character" | "createdAt" | "updatedAt" | "userId";
  interface ExistingHeroProperties {
    owner: string;
    id: number;
    character: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
  }
  type Hero = ExistingHeroProperties & HeroWithStats;
  type ServerItemType = "skin" | "title" | "pet" | "consumable" | "codex";
  type ServerInventoryCategories = {
    [T in Pluralize<Exclude<ServerItemType, "codex">> | "codices"]: Item[];
  };
  type EquippableItemType = Exclude<ServerItemType, "consumable" | "codex">;
  interface ItemInstance {
    equipped: boolean;
    itemID: number;
  }
  interface Item extends ItemInstance {
    action: string;
    activityRestriction: string | null;
    class: string | null;
    createdAt: string;
    description: string;
    dropRate: number | null;
    effects: Effect[];
    exhaustible: boolean;
    icon: string;
    id: number;
    levelRestriction: number | null;
    lore: string | null;
    name: string;
    ptCost: number | null;
    type: ServerItemType;
    updatedAt: string;
    count?: number;
  }
  type ItemWithOwnership = Item & {
    owned: boolean;
  };
  type BattleInstantItem = "Storm Crow Bone Chimes" | "Smoldering Skull Torch" | "Petrified Power Totem" | "Wave-Swept Battle Conch" | "Plague Token" | "Obsidian Mirror";
  interface Effect {
    name: string;
    type: string;
    description: string;
  }
  type Stat = "Power" | "Health" | "Armor" | "Recovery" | "Fire" | "Earth" | "Air" | "Water" | "Aether";
  type Extends<T, U extends T> = U;
  type PrimaryElement = Extends<Stat, "Fire" | "Earth" | "Air" | "Water">;
  type EveryElement = Extends<Stat, "Fire" | "Earth" | "Air" | "Water" | "Aether">;
  interface StartingElementalPower {
    fire: number;
    earth: number;
    water: number;
    air: number;
  }
  interface AttrObj {
    stat: Stat;
    lcName: Lowercase<Stat>;
    value: string;
    descriptionShort: string;
    description: string;
    descriptionArray: string[];
    type: string;
    earnedBy: string;
  }
  type CharacterName = "Compost Creature" | "Wilhelm the Wild" | "Repete" | "Filtron Five" | "Solar Celeste" | "Empath Aurelia" | "Boulder Bro" | "Chrono Guy" | "Timber Terror" | "Natural Ninja";
  type CharacterAlias = "Compost Creature" | "Wildspeaker" | "Scavenger Robot" | "Filtron Five" | "Solar Warrior" | "Empath" | "Boulder Bro" | "Chrono Guy" | "Timber Terror" | "Natural Ninja";
  interface HeroChoice {
    active: boolean;
    character: CharacterName;
    alias: CharacterAlias;
    elms: StartingElementalPower;
    skills: string[];
    ultimate: string;
    colors: string[];
    image: string;
    description: string;
    history: string;
  }
  type SelectedHero = StartingElementalPower & {
    character: CharacterName;
  };
  type SpiritFoe = "Wraith" | "Specter" | "Apparition" | "Banshee" | "Poltergeist" | "Phantasm" | "Shade" | "Phantom" | "Shadow-Self";
  type ElementalFoe = "Gusty Rascal" | "Rock Skipper" | "Flame Fiend" | "Splash Artist" | "Wheezing Jinn" | "Granite Golem" | "Burning Jinn" | "Cyclonic Siren" | "Storming Oni" | "Hulking Aggro Crag" | "Scorching Archfiend" | "High Priestess of the Tides";
  type TitanFoe = "Guardian of the Depths" | "Plaguebringer";
  type FoeType = SpiritFoe | ElementalFoe | TitanFoe;
  interface FoeAbility {
    effect: string;
    name: string;
    type: string;
  }
  type FoeClass = "Elementals" | "Spirits" | "Titans";
  interface Foe {
    ability: FoeAbility;
    air: number;
    armor: number;
    class: FoeClass;
    difficulty: number;
    earth: number;
    fire: number;
    health: number;
    name: string;
    power: number;
    ptBounty: number;
    type: FoeType;
    water: number;
    xpBounty: number;
    foe?: string[];
    reward?: {
      type: string;
      name: string;
    };
    levelRequirement?: number;
    itemSummonOnly?: boolean;
  }
  interface AllFoes {
    Spirits: Foe[];
    Elementals: Foe[];
    Titans: Foe[];
  }
  type Tint = "fire_tint" | "earth_tint" | "water_tint" | "air_tint" | "banshee_tint" | "poltergeist_tint" | "specter_tint" | "wraith_tint" | "phantom_tint" | "phantasm_tint" | "shade_tint" | "apparition_tint";
  type UniqueImageSkin = "shadow_self" | "ascended_self" | "gale_force" | "fire_brand" | "earth_shaker" | "tide_caller";
  type SkinLcUnderscoreName = UniqueImageSkin | Tint;
  type SkinName = "Fire Tint" | "Earth Tint" | "Water Tint" | "Air Tint" | "Banshee Tint" | "Poltergeist Tint" | "Specter Tint" | "Wraith Tint" | "Phantom Tint" | "Phantasm Tint" | "Shade Tint" | "Apparition Tint" | "Shadow Self" | "Ascended Self" | "Gale Force" | "Fire Brand" | "Earth Shaker" | "Tide Caller";
  type ZodiacSign = "Capricorn" | "Aquarius" | "Pisces" | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo" | "Libra" | "Scorpio" | "Sagittarius";
  type TabType = "Consumables" | "Costumes" | "Pets" | "Codex" | "Titles";
  type TabColors = {
    [T in TabType]: [string, string];
  };
  type ActionFeedbackType = "info" | "caution" | "error" | "success";
  interface GlobalMessage {
    type: ActionFeedbackType;
    message: string;
    persist?: boolean;
    link?: string;
  }
  type GlobalMessages = GlobalMessage[];
  type BattleOutcome = "Avatar Wins" | "Foe Wins" | "Draw" | "Double KO";
  interface BattleElementStats {
    air: number;
    earth: number;
    fire: number;
    water: number;
    total: number;
  }
  interface BattleElementalProcs {
    air: {
      evaded: boolean;
    };
    earth: {
      thornsDamageToAttacker: number;
      thornsFactor: string;
    };
    fire: {
      critChance: number;
      critDamage: number;
    };
    water: {
      amountHealed: number;
      healingFactor: string;
    };
  }
  interface BattleRound {
    aggressor: "Foe" | "Avatar";
    aggressorHealthLeft: number;
    defender: "Foe" | "Avatar";
    defenderHealthLeft: number;
    elementalDamageDealt: BattleElementStats;
    elementalProcs: BattleElementalProcs;
    elementalReduction: BattleElementStats;
    physicalDamageDealt: number;
    physicalReduction: number;
    turn: number;
  }
  interface BattleFoe {
    ability: {
      effect: string;
      name: string;
      type: "prebattle" | "postbattle";
    };
    air: number;
    armor: number;
    class: "Elementals" | "Spirits" | "Titans";
    difficulty: number;
    earth: number;
    fire: number;
    health: number;
    name: string;
    power: number;
    ptBounty: number;
    type: FoeType;
    water: number;
    xpBounty: number;
    aether?: number;
  }
  interface BattleBRA {
    activityXP: number;
    aether: number;
    air: number;
    armor: number;
    battleDkos: number;
    battleDraws: number;
    battleLosses: number;
    battleWins: number;
    battleXP: number;
    character: CharacterName;
    earth: number;
    equipped: Item[];
    fire: number;
    health: number;
    id: number;
    maxHealth: number;
    name: string;
    owner: string;
    photonTokens: number;
    power: number;
    qp: number;
    status: HeroStatus;
    statusFade: number;
    water: number;
  }
  type BattleReportStats = "health" | "power" | "armor" | "fire" | "earth" | "water" | "air" | "aether";
  interface BattleEffectProc {
    effect: string;
    heroStatsEffected?: BattleReportStats[];
    foeStatsEffected?: BattleReportStats[];
    type?: "postbattle";
  }
  interface BattleSeasonalBonusElement {
    element: PrimaryElement;
    sign: ZodiacSign;
  }
  interface Battle {
    aStatus: HeroStatus;
    avatar: Hero;
    avatarID: number;
    avatarName: string;
    bra: BattleBRA;
    brf: BattleFoe;
    createdAt: Date;
    effects: string[] | null;
    effectProcs: BattleEffectProc[] | null;
    foe: BattleFoe;
    foeType: FoeType;
    itemsAcquired: Item[] | undefined;
    id: number;
    outcome: BattleOutcome;
    owner: string;
    postBattleActions: string[];
    ptGain: number;
    roundBreakdown: BattleRound[];
    scenario: number;
    seasonalBonusElement: BattleSeasonalBonusElement;
    seenReport: boolean;
    updatedAt: Date;
    xpGain: number;
  }
  interface BattleDetailOnly {
    avatar: Hero;
    bra: BattleBRA;
    brf: BattleFoe;
    effects: string[] | null;
    effectProcs: BattleEffectProc[] | null;
    foe: BattleFoe;
    foeType: FoeType;
    outcome: BattleOutcome;
    roundBreakdown: BattleRound[];
    scenario: number;
    seasonalBonusElement: {
      element: PrimaryElement;
      sign: ZodiacSign;
    };
    updatedAt: Date;
  }
}

export default HF;
