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

            try {
                const nfts = await TonService.getNftsFromTargetCollection(it.address);

                if (!nfts.length) {
                    const tgMember = await BotService.getChatMember(+it.tgUserId);
                    console.log(`Remove ${tgMember.user.username} from chat`)
                    await BotService.kickChatMember(+it.tgUserId);
                    await BotService.sendMessage(chatMessagesConfig.watchdog.ban.replace("$USER$", tgMember.user.username));
                    await ChatMembersService.removeChatMember(it);
                }

            } catch (e) {
                console.error(e);
            }

            await new Promise(res => setTimeout(res, 200))
        }
    }
}
