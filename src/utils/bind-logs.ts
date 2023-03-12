import { BotService } from "../services/bot.service";
import config from "../config";

const defaultLog = console.log;
console.log = (...args) => {
    if (config.NODE_ENV === "production")
        BotService.sendMsgToAdmin(JSON.stringify(args))

    defaultLog(...args, new Date())
}

const defaultError = console.error;
console.error = (...args) => {
    if (config.NODE_ENV === "production")
        BotService.sendErrorToAdmin(JSON.stringify(args))

    defaultError(...args, new Date())
}
