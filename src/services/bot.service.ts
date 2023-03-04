import { Telegraf } from "telegraf-ts";
import config from "../config";
import { TonService } from "./ton.service";
import { colorByRarity, Nft, rarityPosition } from "../models/types";
import moment from "moment";
import base64 from "base-64";
import { Address } from 'ton';
import { ChatMembersService } from "./chat-members.service";
import { ChatWatchdogService } from "./chat-watchdog.service";

const CHECK_TXN_ACTION = "check-txn-from-user-to-register"

export class BotService {

    private static bot: Telegraf<any>;

    private static addressOtp: { [address: string]: number } = {};

    private static userAddress: { [tgUserId: string]: string } = {};

    static async start() {
        console.log("Bot started!");

        this.bot = new Telegraf(config.BOT_TOKEN);

        // await ChatMembersService.init();
        // await ChatWatchdogService.start(this.bot);
        // this.bindOnStart();
        // this.bindOnText();
        // this.bindOnCheckTxn();

        this.bot.launch()
    }


    private static bindOnStart() {
        this.bot.start((ctx) => {
            ctx.reply('Хэй, дружище!\nЕсли ты действительно хочешь в этот закрытый клуб, предъяви свои документики😎\n *отпарвь адрес своего кошелька*\n\nУ тебя должен быть хотя бы один наш NFT + не на продаже!');
        });
    }

    private static bindOnText() {
        this.bot.on('text', async (ctx) => {
            const address = ctx.message.text;
            const tgUserId = ctx.message.from.id;

            if (ChatMembersService.chatMemberByUserId[tgUserId]) {
                await ctx.reply("Да успокойся, ты уже в банде 😉");
                return;
            }

            try {
                const nfts = await TonService.getNftsFromTargetCollection(address);

                if (!nfts.length) {
                    await ctx.reply("Оу, дружище, мы не смогли найти у тебя наших NFT.")
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
                                    text: "Отправить",
                                    url: this.createPayTonkeeperUrl(TonService.formatBalanceFromView(config.PAYMENT_FROM_VIRGIN), targetOtp)
                                },
                                {
                                    text: "Проверить",
                                    callback_data: CHECK_TXN_ACTION
                                }
                            ],
                        ]
                    }
                })
            } catch (e) {
                await ctx.reply(`Ошибка системы: ${e.message}!\n\nПожалуйста, сообщите об этом администратору!`)
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
                ctx.reply(`Отлично, теперь ты часть нашей обезьяньей братвы!\n\nПрисодиняйся к <a href="${chatLink}">${config.TWA_CHAT_NAME}</a>`, {
                    parse_mode: "HTML"
                })
                return;
            }

            ctx.reply("Хм... Кажется, твоя транзакция ещё не пришла.\nПопробуй повторить проверку чуть позже.")
        });
    }

    private static prepareMsgWithNft(nfts: Nft[], otp: number): string {
        const nftNames = nfts
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

        const endText = `Окей, теперь давай убедимся, что ты - это ты.\nОтправь 0.001 TON (это даже не рубль 😉) на этот адрес ${config.OWNER_ADDRESS} и комментарием: ${otp}`

        if (nftNames.length === 1) {
            return `Oу, да ты у нас новичёк!\n\n${nftNames}\nНу, ничего страшного!\n${endText}`
        }

        if (nftNames.length > 2 && nftNames.length < 5) {
            return `Милости просим, собрат!\n\n${nftNames}\nНу, ничего страшного!\n${endText}`
        }

        return `Для таких господ, как вы, местечно всегда зарезервировано!\n\n${nftNames}\n${endText}`
    }

    private static createPayTonkeeperUrl(amount: number, text: number) {
        return `https://app.tonkeeper.com/transfer/${config.OWNER_ADDRESS}?amount=${amount}&text=${text}`;
    }

    private static async showUpdates() {
        const updates = await this.bot.telegram.getUpdates();
        console.log(updates)
        console.log(JSON.stringify(updates))
    }
}
