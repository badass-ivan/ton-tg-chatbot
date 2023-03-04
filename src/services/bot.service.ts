import { Telegraf } from "telegraf-ts";
import config from "../config";
import { TonService } from "./ton.service";
import { colorByRarity, Nft, rarityPosition } from "../models/types";
import moment from "moment";
import base64 from "base-64";
import { Address } from 'ton';
import { ChatMembersService } from "./chat-members.service";
import { ChatWatchdogService } from "./chat-watchdog.service";
import chatMessagesConfig from "../chat-messages.config";

const CHECK_TXN_ACTION = "check-txn-from-user-to-register"

export class BotService {

    private static bot: Telegraf<any>;

    private static addressOtp: { [address: string]: number } = {};

    private static userAddress: { [tgUserId: string]: string } = {};

    static async start() {
        console.log("Bot started!");

        this.bot = new Telegraf(config.BOT_TOKEN);

        await ChatMembersService.init();
        await ChatWatchdogService.start(this.bot);

        this.bindOnStart();
        this.bindOnText();
        this.bindOnCheckTxn();

        this.bot.launch()
    }


    private static bindOnStart() {
        this.bot.start((ctx) => {
            ctx.reply(chatMessagesConfig.sign.start);
        });
    }

    private static bindOnText() {
        this.bot.on('text', async (ctx) => {
            const address = ctx.message.text;
            const tgUserId = ctx.message.from.id;

            if (ChatMembersService.chatMemberByUserId[tgUserId]) {
                await ctx.reply(chatMessagesConfig.sign.gettingAddress.alreadyInBand);
                return;
            }

            try {
                const nfts = await TonService.getNftsFromTargetCollection(address);

                if (!nfts.length) {
                    await ctx.reply(chatMessagesConfig.sign.gettingAddress.noNft)
                    return;
                }

                const targetOtp = moment().unix();

                this.addressOtp[address] = targetOtp;

                this.userAddress[tgUserId] = address;

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
                await ctx.reply(chatMessagesConfig.systemError.replace("$ERROR$", e.message))
            }
        });
    }

    private static bindOnCheckTxn() {
        this.bot.action(CHECK_TXN_ACTION, async (ctx) => {
            const txns = await TonService.getTxns(config.OWNER_ADDRESS);

            const hasTxn = txns.reverse().find(txn => {
                const decodedRawMsg = base64.decode(txn.in_msg.msg_data);
                const otp = decodedRawMsg.slice(decodedRawMsg.length - 9)
                const address = Address.parseRaw(txn.in_msg.destination.address);
                return this.addressOtp[address.toString()] === +otp;
            });

            if (hasTxn) {
                const tgUserId = ctx.message.from.id;
                const address = this.userAddress[tgUserId];

                await ChatMembersService.saveChatMember({ tgUserId, address, })

                const chatLink = await this.bot.telegram.exportChatInviteLink(config.CHAT_ID);
                const link = `<a href="${chatLink}">${chatMessagesConfig.chatName}</a>`;

                ctx.reply(chatMessagesConfig.sign.checkTxn.payed.replace("$CHAT_LINK$", link), { parse_mode: "HTML" })
                return;
            }

            ctx.reply(chatMessagesConfig.sign.checkTxn.noTxn)
        });
    }

    private static prepareMsgWithNft(nfts: Nft[], otp: number): string {

        const nftNames = this.getBeautifulNftsString(nfts);

        const endText = chatMessagesConfig.sign.gettingAddress.hasNft.endText
            .replace("$PRICE", chatMessagesConfig.sign.price.toString())
            .replace("$ADDRESS$", config.OWNER_ADDRESS)
            .replace("$OTP$", otp.toString())

        let text = "";

        if (nftNames.length === 1) {
            text = chatMessagesConfig.sign.gettingAddress.hasNft.one;
        } else if (nftNames.length > 2 && nftNames.length < 5) {
            text = chatMessagesConfig.sign.gettingAddress.hasNft.less5;
        } else if (nftNames.length >= 5) {
            text = chatMessagesConfig.sign.gettingAddress.hasNft.more5;
        }

        return text.replace("$NFTS$", nftNames)
            .replace("$FINAL_TEXT$", endText)
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

    private static async showUpdates() {
        const updates = await this.bot.telegram.getUpdates();
        console.log(updates)
        console.log(JSON.stringify(updates))
    }
}
