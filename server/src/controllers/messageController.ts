import prisma from "../prismaClient";

/**
 * Local TypeScript interfaces that mirror the Prisma schema.
 * We avoid importing generated types from @prisma/client here to prevent
 * type errors in environments where those exports are not available.
 */

export type Attachment = {
    id: string;
    type: "image" | "video" | "document" | "file";
    isExternal: boolean;
    url?: string | null;
    filename?: string | null;
    original_name?: string | null;

    mime_type?: string;
    size?: number;

    createdAt?: Date;
};

export type User = {
    id: number;
    botId: string;
    userId: string;
    username: string;
    name?: string | null;
    createdAt: Date;
    blocked: boolean;
};

export type Message = {
    id: number;
    botId: string;
    roomId: string;
    userId: string;
    messageType:
        | "user_message"
        | "user_message_service"
        | "bot_message_service"
        | "manager_message"
        | "service_call"
        | "error_message"
        | string;
    text: string;
    attachments?: Attachment[] | null;
    meta?: Record<string, any> | null;
    createdAt: Date;
};

export type AddMessageInput = {
    botId: string;
    roomId: string;
    userId: string;
    username?: string;
    name?: string | null;
    messageType?: Message["messageType"];
    text?: string;
    attachments?: Attachment[] | null;
    meta?: Record<string, any> | null;
};

export async function createOrGetUser(
    botId: string,
    userId: string,
    username?: string,
    name?: string | null,
): Promise<User> {
    const existing = await prisma.user.findFirst({
        where: { botId, userId },
    });

    if (existing) return existing as unknown as User;

    return (await prisma.user.create({
        data: {
            botId,
            userId,
            username: username ?? userId,
            name,
        },
    })) as unknown as User;
}

/**
 * addUser
 * - simple exported helper that mirrors createOrGetUser for API usage
 */
export async function addUser(botId: string, userId: string, username?: string, name?: string | null): Promise<User> {
    return createOrGetUser(botId, userId, username, name);
}

export async function addMessage(payload: AddMessageInput): Promise<Message> {
    const {
        botId,
        userId,
        username,
        name,
        roomId,
        messageType = "user_message",
        text = "",
        attachments = null,
        meta = null,
    } = payload;

    // ensure user exists
    await createOrGetUser(botId, userId, username, name);

    const msg = await prisma.message.create({
        data: {
            botId,
            roomId,
            userId,
            messageType: messageType as any,
            text,
            // Prisma expects Json for attachments/meta; cast at call site
            attachments: attachments ? (attachments as any) : null,
            meta: meta ? (meta as any) : null,
        },
    });

    return msg as unknown as Message;
}

export type GetMessagesOptions = {
    botId?: string;
    roomId?: string;
    cursorId?: number;
    limit?: number;
    types?: Message["messageType"][];
};

export async function getMessages(opts: GetMessagesOptions = {}) {
    const where: any = {};
    if (opts.botId) where.botId = opts.botId;
    if (opts.roomId) where.roomId = opts.roomId;
    if (typeof opts.cursorId === "number") where.id = { lt: opts.cursorId };
    if (opts.types && opts.types.length > 0) where.messageType = { in: opts.types };

    const messages = await prisma.message.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: opts.limit ?? 20,
    });

    return messages as unknown as Message[];
}

export async function getBots(): Promise<string[]> {
    // Fetch all botIds from messages and return unique list.
    const rows = await prisma.message.findMany({
        select: { botId: true },
        orderBy: { botId: "asc" },
    });

    const bots = Array.from(new Set(rows.map((r: any) => r.botId)));
    return bots;
}

export type RoomInfo = {
    botId: string;
    roomId: string;
    users: User[];
    lastMessage?: Message | null;
};

export type GetRoomsOptions = {
    botId: string;
    messageType?: string; // Filter by message type (e.g., "error_message")
    depth?: number; // Default 5 - check if type appears in last N messages
};

/**
 * getRooms(opts)
 * - Scans messages for the given botId and returns a list of rooms.
 * - Each room includes the botId, roomId, array of users present in the room,
 *   and the most recent message for that room (lastMessage).
 * - Optional filtering by messageType with depth check: only returns rooms where
 *   the specified message type appears in the last `depth` messages of that room.
 *   This is useful for finding cases like error+automated message sequences.
 */
export async function getRooms(opts: GetRoomsOptions): Promise<{ rooms: RoomInfo[] }> {
    const { botId, messageType, depth = 5 } = opts;

    if (!botId) {
        throw new Error("botId is required");
    }

    // Fetch recent messages for the bot (ordered newest-first so we can easily pick lastMessage)
    const messages = await prisma.message.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
        select: {
            roomId: true,
            userId: true,
            id: true,
            botId: true,
            messageType: true,
            text: true,
            attachments: true,
            meta: true,
            createdAt: true,
        },
    });

    // Group messages by roomId for filtering
    const messagesByRoom = new Map<string, typeof messages>();
    for (const m of messages) {
        if (!messagesByRoom.has(m.roomId)) {
            messagesByRoom.set(m.roomId, []);
        }
        messagesByRoom.get(m.roomId)!.push(m);
    }

    // Determine unique roomIds in order of most-recent message first
    const seenRooms = new Set<string>();
    const roomIds: string[] = [];
    for (const m of messages) {
        if (!seenRooms.has(m.roomId)) {
            seenRooms.add(m.roomId);
            roomIds.push(m.roomId);
        }
    }

    const rooms: RoomInfo[] = [];

    // For each room, compute distinct users and the last message
    for (const roomId of roomIds) {
        const roomMessages = messagesByRoom.get(roomId) || [];

        // If messageType filter is applied, check if it appears in last `depth` messages
        if (messageType) {
            const lastNMessages = roomMessages.slice(0, depth);
            const hasMatchingType = lastNMessages.some(m => m.messageType === messageType);
            if (!hasMatchingType) {
                continue; // Skip this room - filter not matched
            }
        }

        // collect distinct userIds for this room
        const userIds = Array.from(new Set(roomMessages.map(m => m.userId)));

        // fetch user records (may be empty if user not created)
        const users = await prisma.user.findMany({
            where: {
                botId,
                userId: { in: userIds },
            },
        });

        // lastMessage: since messages are ordered desc, the first match is the latest
        const lastMessage = roomMessages[0] || null;

        rooms.push({
            botId,
            roomId,
            users: users as unknown as User[],
            lastMessage: lastMessage as unknown as Message | null,
        });
    }

    return { rooms };
}
