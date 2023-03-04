import axios from "axios";
import config, { TON_REQ_HEADER } from "../config";

export class TonService {

    static async getNftsFromTargetCollection(address: string) {
        try {
            const { data } = await axios.get(`${config.TON_API_URL}/nft/searchItems?`+ new URLSearchParams({
                owner: address,
                collection: config.TWA_COLLECTION_ADDRESS,
                "include_on_sale": "false",
                limit: "20",
                offset: "0"
            }).toString(), TON_REQ_HEADER);

            return data.nft_items;
        } catch (e) {
            if (e.response.data.includes("illegal base64 data at input byte ")) {
                throw Error("Дружище, это не похоже на адрес...")
            }

            throw Error(e.response.data.error || e.response.data.message || e.response.data)
        }
    }

    static async getTxns(address: string) {
        try {
            const { data } = await axios.get(`${config.TON_API_URL}/blockchain/getTransactions?`+ new URLSearchParams({
                account: address,
            }).toString(), TON_REQ_HEADER);

            return data.transactions;
        } catch (e) {
            const errorData = e.response.data;

            if (typeof errorData === "string" && errorData.includes("illegal base64 data at input byte ")) {
                throw Error("Дружище, это не похоже на адрес...")
            }

            throw Error(errorData.error || errorData.message || errorData)
        }
    }

    static formatBalanceFromView(num: number) {
        return num * 10 ** 9
    }
}
