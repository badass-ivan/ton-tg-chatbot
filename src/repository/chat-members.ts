import { ChatMember, RawChatMember } from "../models/types";
import { Column, Model, PrimaryKey, Table } from "sequelize-typescript";
import { v4 as uuid } from "uuid";

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

    static async saveChatMember(member: RawChatMember): Promise<ChatMember> {
        const address = member.address;
        const tgUserId = member.tgUserId.toString();
        return (await ChatMembers.findOrCreate({
            where: { tgUserId },
            defaults: { id: uuid(), address, tgUserId }
        }))[0]
    }

    static async removeChatMemberById(id: string): Promise<void> {
        await ChatMembers.destroy({
            where: { id },
        })
    }
}
