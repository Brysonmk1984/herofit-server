import { SpecialEvent } from "./types/BackendOnlyTypes";
import { testSpecificFoe, appWelcome } from "./game/specialEvents/specialEventList";
import HF from "./types/herofit";

const appState = ["live", "maintenance"];

interface Config {
  mode: string;
  specialEvent?: SpecialEvent;
  globalMessage?: HF.GlobalMessage[];
  disableErrorEmailReporting: boolean;
}

const config: Config = {
  mode: appState[0],
  specialEvent: appWelcome,
  disableErrorEmailReporting: false,
  globalMessage: [
    { type: "info", persist: false, message: "Unique hero passive abilities are now live, click here to find out more.", link: "https://www.reddit.com/r/herofit/comments/to4fsf/great_news_herofit_fam/" },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)" }
  ],
};

export { config };
