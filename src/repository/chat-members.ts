import { ChatMember, RawChatMember } from "../models/types";
import { Column, Model, PrimaryKey, Table } from "sequelize-typescript";

@Table({
    tableName: "chat_members",
    timestamps: false,
    createdAt: false,
    updatedAt: false,
})
export class ChatMembers extends Model {

    @PrimaryKey
    @Column
    id: string;

    @Column({ field: "address" })
    address: string;

    @Column({ field: "tg_user_id" })
    tgUserId: string;

    static async getAllChatMembers(): Promise<ChatMember[]> {
        return this.findAll()
    }

    static async saveChatMember({ address, tgUserId }: RawChatMember): Promise<ChatMember> {
        return (await ChatMembers.findOrCreate({
            where: { tgUserId },
            defaults: { address, tgUserId }
        }))[0]
    }
}
