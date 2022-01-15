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
  //   { type: "info", persist: false, message: "New to the Game? Click here for some helpful info in our reddit community", link: "https://www.reddit.com/r/herofit/comments/ry9i4d/for_the_newcomers_heres_a_few_tips_to_help_you/" },
  //   { type : 'info', persist : false, message : "You can now donate CAKE :)" }
  // ],
};

export { config };
