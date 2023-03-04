import { Telegraf } from "telegraf-ts";
import config from "../config";
import { TonService } from "./ton.service";
import { ChatMembersService } from "./chat-members.service";

export class ChatWatchdogService {

    private static bot: Telegraf<any>;

    static start(bot: Telegraf<any>) {
        this.bot = bot;

        this.startCheckingChatUsers();
    }

    private static async startCheckingChatUsers() {
        console.log("Check bad chat members")
        await this.checkChatUsers();

        setInterval(() => {
            this.checkChatUsers();
        }, 1000 * 60 * 10);
    }

    private static async checkChatUsers() {
        const members = ChatMembersService.getChatMembers();

        await Promise.all(members.map(async it => {
            const nfts = await TonService.getNftsFromTargetCollection(it.address);

            if (!nfts.length) {
                const member = await this.bot.telegram.getChatMember(config.CHAT_ID, +it.tgUserId);
                console.log(`Remove ${member.user.username} from chat`)
                await this.bot.telegram.kickChatMember(config.CHAT_ID, +it.tgUserId);
                await this.bot.telegram.sendMessage(config.CHAT_ID, `${member.user.username} изгнан😈! Отсутствие обезьяны карается!`);
            }
        }))
    }
}
