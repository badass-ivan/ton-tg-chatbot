import { TonService } from "./ton.service";
import { ChatMembersService } from "./chat-members.service";
import chatMessagesConfig from "../chat-messages.config";
import { BotService } from "./bot.service";

export class ChatWatchdogService {

    static start() {
        this.startCheckingChatUsers();
        console.log("Watchdog inited")
    }

    private static async startCheckingChatUsers() {
        await this.checkChatUsers();

        setInterval(() => {
            this.checkChatUsers();
        }, 1000 * 60 * 10);
    }

    private static async checkChatUsers() {
        console.log("Start watchdog finding...")
        const members = ChatMembersService.getChatMembers();

        for(let i = 0; i < members.length; i++) {
            const it = members[i];
            console.log(`Watchdog check ${it.tgUserId} with ${it.address}`)

            const nfts = await TonService.getNftsFromTargetCollection(it.address);

            if (!nfts.length) {
                const member = await BotService.getChatMember(+it.tgUserId);
                console.log(`Remove ${member.user.username} from chat`)
                await BotService.kickChatMember(+it.tgUserId);
                await BotService.sendMessage(chatMessagesConfig.watchdog.ban.replace("$USER$", member.user.username));
            }

            await new Promise(res => setTimeout(res, 200))
        }
    }
}
