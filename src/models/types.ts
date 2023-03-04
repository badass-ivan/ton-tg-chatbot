export type Nft = {
    address: string,
    approved_by: null,
    collection: {
        address: string,
        name: string
    },
    collection_address: string,
    index: 0,
    metadata: {
        name: string,
        description: string,
        marketplace: string,
        attributes:[{ "trait_type": string, "value": string }],
        image: string
    },
    owner: {
        address: string,
        icon: string,
        is_scam: false,
        name: string, // domain
    },
    verified: true
}

export type Txn = {
    in_msg: {
        msg_data: string,
        destination: {
            address: string,
        }
    }
}

export enum Rarity {
    Common = "Common",
    Uncommon = "Uncommon",
    Rare = "Rare",
    Epic = "Epic",
}

export const rarityPosition = {
    "Common": 3,
    "Uncommon": 2,
    "Rare": 1,
    "Epic": 0,
}

export const colorByRarity = {
    "Common": "🟢",
    "Uncommon": "🔵",
    "Rare": "🟣",
    "Epic": "🔴",
}

export type RawChatMember = {
    address: string,
    tgUserId: string,
}

export type ChatMember = RawChatMember & {
    id: string,
}
