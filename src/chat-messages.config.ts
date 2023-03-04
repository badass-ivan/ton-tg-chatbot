export default {

    systemError: "Ошибка системы: $ERROR$!\n\nПожалуйста, сообщите об этом администратору!",

    chatName: "TWA holders",

    sign: {
        start: 'Хэй, дружище!\nЕсли ты действительно хочешь в этот закрытый клуб, предъяви свои документики😎\n *отпарвь адрес своего кошелька*\n\nУ тебя должен быть хотя бы один наш NFT + не на продаже!',

        price: 0.001,

        gettingAddress: {

            alreadyInBand: "\"Да успокойся, ты уже в банде 😉\"",

            noNft: "Оу, дружище, мы не смогли найти у тебя наших NFT.",

            btns: {
                send: "Отправить",
                check: "Проверить",
            },

            hasNft: {
                one: "Oу, да ты у нас новичёк!\n\n$NFTS$\nНу, ничего страшного!\n$FINAL_TEXT$",

                less5: "Милости просим, собрат!\n\n$NFTS$\nНу, ничего страшного!\n$FINAL_TEXT$",

                more5: "Для таких господ, как вы, местечно всегда зарезервировано!\n\n$NFTS$\n$FINAL_TEXT$",

                endText: "Окей, теперь давай убедимся, что ты - это ты.\nОтправь $PRICE$ TON (это даже не рубль 😉) на адрес $ADDRESS$ И НЕ ЗАБУДЬ комментарий: $OTP$",
            }
        },

        checkTxn: {
            payed: "Отлично, теперь ты часть нашей обезьяньей братвы!\n\nПрисодиняйся к $CHAT_LINK$",

            noTxn: "Хм... Кажется, твоя транзакция ещё не пришла.\nПопробуй повторить проверку чуть позже.",
        }
    }
}
