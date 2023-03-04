import { Telegraf } from "telegraf-ts";
import config from "../config";
import { TonService } from "./ton.service";
import { colorByRarity, NewChatMember, Nft, rarityPosition, Txn } from "../models/types";
import moment from "moment";
import base64 from "base-64";
import { Address } from 'ton';
import { ChatMembersService } from "./chat-members.service";
import { ChatWatchdogService } from "./chat-watchdog.service";
import chatMessagesConfig from "../chat-messages.config";
import { errorHandler } from "../utils/error-handler";

const CHECK_TXN_ACTION = "check-txn-from-user-to-register"

export class BotService {

    private static bot: Telegraf<any>;

    private static addressOtp: { [address: string]: number } = {};

    private static userSessionData: { [tgUserId: string]: { address: string, nfts: Nft[] } | null } = {};

    static async start() {
        console.log("Start bot preparing");

        this.bot = new Telegraf(config.BOT_TOKEN);

        await ChatMembersService.init();
        await ChatWatchdogService.start();

        this.bindOnStart();
        this.bindOnText();
        this.bindOnCheckTxn();

        this.bot.launch()
        console.log("Bot started!");
    }


    private static bindOnStart() {
        this.bot.start(async (ctx) => {
            if (await this.checkIsUnwatchedMsg(ctx)) {
                return;
            }
            ctx.reply(chatMessagesConfig.sign.start);
        });
    }

    private static bindOnText() {
        this.bot.on('message', async (ctx) => {
            if (ctx.message.new_chat_member) {
                await this.onNewChatMember(ctx, ctx.message.new_chat_member);
                return;
            }

            if (await this.checkIsUnwatchedMsg(ctx)) {
                return;
            }

            const address = ctx.message.text;
            const tgUserId = ctx.message.from.id;

            console.log(`Getting message: ${address} from ${tgUserId}`);

            if (ChatMembersService.chatMemberByUserId[tgUserId]) {
                console.log(`${tgUserId} already in chat`);
                await ctx.reply(chatMessagesConfig.sign.gettingAddress.alreadyInBand);
                return;
            }

            try {
                const nfts = await TonService.getNftsFromTargetCollection(address);

                if (!nfts.length) {
                    console.log(`${tgUserId} has no NFTs`);
                    await ctx.reply(chatMessagesConfig.sign.gettingAddress.noNft)
                    return;
                }

                console.log(`Send check msg to ${tgUserId}`);

                const targetOtp = moment().unix();
                this.addressOtp[address] = targetOtp;
                this.userSessionData[tgUserId] = { address, nfts };

                await ctx.reply(this.prepareMsgWithNft(nfts, targetOtp), {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: chatMessagesConfig.sign.gettingAddress.btns.send,
                                    url: this.createPayTonkeeperUrl(TonService.formatBalanceFromView(chatMessagesConfig.sign.price), targetOtp)
                                },
                                {
                                    text: chatMessagesConfig.sign.gettingAddress.btns.check,
                                    callback_data: CHECK_TXN_ACTION
                                }
                            ],
                        ]
                    }
                })
            } catch (e) {
                console.error(e)
                if (e.message.includes("illegal base64 data at input byte ")) {
                    await ctx.reply(chatMessagesConfig.sign.gettingAddress.isNotAddress);
                    return;
                }
                await errorHandler(ctx, e.message)
            }
        });
    }

    private static async checkIsUnwatchedMsg(ctx: any) {
        const msg = ctx.message;

        if (msg && msg.chat.id === config.CHAT_ID) return true;

        const updateFrom = ctx.update?.callback_query?.from || msg?.from || {};

        if (updateFrom.is_bot) await errorHandler(ctx, "Fuck this bot :)")

        return updateFrom.is_bot;
    }
ss
    private static bindOnCheckTxn() {
        this.bot.action(CHECK_TXN_ACTION, async (ctx) => {
            if (await this.checkIsUnwatchedMsg(ctx)) {
                return;
            }

            const tgUserId = ctx.update.callback_query.from.id;
            console.log(`Finding owner txn from user with tgID:${tgUserId}`);

            const sessionData = this.userSessionData[tgUserId];
            // already registered + clicked check txn btn
            if (!sessionData) {
                return;
            }

            let txns: Txn[] = [];

            try {
               txns = await TonService.getTxns(config.OWNER_ADDRESS);
            } catch (e) {
                await errorHandler(ctx, e.message)
                return;
            }

            const hasTxn = txns.reverse().find(txn => {
                const decodedRawMsg = base64.decode(txn.in_msg.msg_data);
                const otp = decodedRawMsg.slice(decodedRawMsg.length - 9)
                const address = Address.parseRaw(txn.in_msg.destination.address);
                return this.addressOtp[address.toString()] === +otp;
            });

            // if (hasTxn) {
            if (true) {

                try {
                    console.log(`Start saving user ${tgUserId} with address ${sessionData.address}`);
                    await ChatMembersService.saveChatMember({ tgUserId, address: sessionData.address, })
                    console.log(`Done saving user ${tgUserId} with address ${sessionData.address}`);
                } catch (e) {
                    await errorHandler(ctx, e.message)
                    return;
                }

                await ctx.reply(chatMessagesConfig.sign.checkTxn.payed, {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: chatMessagesConfig.chatName,
                                    url: await this.bot.telegram.exportChatInviteLink(config.CHAT_ID)
                                }
                            ],
                        ]
                    }
                })
                return;
            }

            console.log(`Cant find txn from user ${tgUserId} with address ${sessionData.address}`);
            await ctx.reply(chatMessagesConfig.sign.checkTxn.noTxn)
        });
    }

    private static async onNewChatMember(ctx: any, member: NewChatMember) {
        const { nfts } = this.userSessionData[member.id]
        const nftNames = this.getBeautifulNftsString(nfts);

        ctx.reply(chatMessagesConfig.newMember
            .replace("$USER$", member.username)
            .replace("$NFTS$",nftNames));
    }

    private static prepareMsgWithNft(nfts: Nft[], otp: number): string {
        const nftNames = this.getBeautifulNftsString(nfts);

        let text = "";

        if (nftNames.length === 1) {
            text = chatMessagesConfig.sign.gettingAddress.hasNft.one;
        } else if (nftNames.length >= 2 && nftNames.length < 5) {
            text = chatMessagesConfig.sign.gettingAddress.hasNft.less5;
        } else if (nftNames.length >= 5) {
            text = chatMessagesConfig.sign.gettingAddress.hasNft.more5;
        }

        const endText = chatMessagesConfig.sign.gettingAddress.hasNft.endText
            .replace("$PRICE", chatMessagesConfig.sign.price.toString())
            .replace("$ADDRESS$", config.OWNER_ADDRESS)
            .replace("$OTP$", otp.toString())

        return text.replace("$NFTS$", nftNames).replace("$FINAL_TEXT$", endText)
    }

    private static createPayTonkeeperUrl(amount: number, text: number) {
        return `https://app.tonkeeper.com/transfer/${config.OWNER_ADDRESS}?amount=${amount}&text=${text}`;
    }

    static getBeautifulNftsString(nfts: Nft[]) {
        return nfts
            .sort((a, b) => {
                const rarityPositionA = rarityPosition[a.metadata.attributes[0].value];
                const rarityPositionB = rarityPosition[b.metadata.attributes[0].value];

                if (rarityPositionA <= rarityPositionB) {
                    return -1
                }
                return 1;
            })
            .map(it => `${colorByRarity[it.metadata.attributes[0].value]} ${it.metadata.name}\n`)
            .join("");
    }

    static async getChatMember(tgUserId: number) {
        return this.bot.telegram.getChatMember(config.CHAT_ID, tgUserId);
    }

    static async kickChatMember(tgUserId: number) {
        await this.bot.telegram.kickChatMember(config.CHAT_ID, tgUserId);
    }

    static async sendMessage(message: string) {
        await this.bot.telegram.sendMessage(config.CHAT_ID, message);
    }

    private static async showUpdates() {
        const updates = await this.bot.telegram.getUpdates();
        console.log(updates)
        console.log(JSON.stringify(updates))
    }
}
