import { SpecialEvent } from "./types/BackendOnlyTypes";
import { testSpecificFoe, appWelcome } from "./game/specialEvents/specialEventList";
import HF from "./types/herofit";

const appState = ["live", "maintenance"];

interface Config {
  mode: string;
  specialEvent?: SpecialEvent;
  globalMessage?: HF.GlobalMessage[];
}

const config: Config = {
  mode: appState[0],
  specialEvent: appWelcome,

  // globalMessage: [
  //   { type: "info", persist: false, message: "HeroFit needs reviews, especially on iOS. Click here to leave one in the app store.", link: "https://apps.apple.com/app/id1592847717" },
  //   //{ type : 'info', persist : false, message : "You can now donate CAKE :)" }
  // ],
};

export { config };
