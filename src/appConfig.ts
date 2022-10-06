import { SpecialEvent } from "./types/BackendOnlyTypes";
import { testSpecificFoe, appWelcome, helloween } from "./game/specialEvents/specialEventList";
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
  specialEvent: helloween,
  disableErrorEmailReporting: false,
  globalMessage: [
    //{ type: "info", persist: false, message: "Smelling Salts - New item Revives your Hero! click here to read about it.", link: "https://www.reddit.com/r/herofit/comments/u0lhfa/introducing_a_new_highly_requested_item/" },
    // { type : 'info', persist : false, message : "Lots of updates & Special Event! Click here to read about it.", link: "https://www.reddit.com/r/herofit/comments/xszn5i/new_patch_and_special_halloween_event_is_here/" }
  ],
};

export { config };
