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

  disableErrorEmailReporting: false,
  globalMessage: [
    //{ type: "info", persist: false, message: "Smelling Salts - New item Revives your Hero! click here to read about it.", link: "https://www.reddit.com/r/herofit/comments/u0lhfa/introducing_a_new_highly_requested_item/" },
    //{ type : 'info', persist : false, message : "You can now donate CAKE :)" }
  ],
};

export { config };
