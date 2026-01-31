import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { IonButton, toastController } from "@ionic/vue";
import { ChatLayer, type Message, type RoomInfo } from "../../../chatLayerSDK_node/chatLayerSDK.ts";
import { t } from "../i18n";
import localforage from "localforage";
import { notificationManager } from "../helpers/notificationManager";

/**
 * UI Store
 * - Holds global UI state: bots, rooms, messages, selected botId / roomId
 * - Exposes loaders: loadBots -> auto-select first bot -> loadRooms(botId)
 * - Exposes room/message loaders and a global long-poll listener (UI role)
 *
 * Usage:
 *  const ui = useUiStore();
 *  ui.init(); // start listener and load initial data
 */

export const useUiStore = defineStore("ui", () => {
    const bots = ref<string[]>([]);
    const rooms = ref<RoomInfo[]>([]);
    const messages = ref<Message[]>([]);
const selectedBotId = ref<string | undefined>(undefined);
const selectedRoomId = ref<string | undefined>(undefined);

// Search state for client-side chat search
const search = ref<{ query: string }>({ query: "" });
const isSearchActive = computed(() => {
    try {
        const q = (search.value.query || "").trim();
        return q.length > 0;
    } catch {
        return false;
    }
});
const searchTokens = computed(() =>
    (search.value.query || "")
        .split(/\s+/)
        .map(s => s.trim())
        .filter(Boolean),
);

// Room filter state for server-side filtering by message type
const roomFilter = ref<{
    messageType: string | null;
    depth: number;
}>({
    messageType: null, // null = no filter
    depth: 5, // default depth
});

    
    // Local settings object
    const localSettings = ref({
        notificationLevel: "ManagerCalls" // Default: only service_call notifications
    });
    
    // Unread messages tracking - roomKey is "botId_roomId"
    const unread = ref<Record<string, number>>({});

    // ChatLayer SDK instance + unsubscribe
    let chat: ChatLayer | null = null;
    let unsubscribe: (() => void) | null = null;
    let started = false;
    
    // Cache variables
    let saveTimeout: number | null = null;
    const CACHE_KEY = "uiStore_cache";
    
    // Debounce function to save state after 5 seconds
    function debounceSave() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
            saveStateToCache();
        }, 5000) as unknown as number;
    }
    
    // Save state to localforage
    async function saveStateToCache() {
        try {
            const stateToSave = {
                bots: bots.value,
                rooms: rooms.value,
                messages: messages.value,
                selectedBotId: selectedBotId.value,
                selectedRoomId: selectedRoomId.value,
                localSettings: localSettings.value,
                unread: unread.value,
                search: search.value,
                roomFilter: roomFilter.value,
                timestamp: Date.now()
            };
            // Ensure we only persist plain JSON-serializable data to avoid IndexedDB DataCloneError
            // (Vue reactive proxies / non-cloneable values will be stripped by JSON serialization)
            const plain = JSON.parse(JSON.stringify(stateToSave));
            await localforage.setItem(CACHE_KEY, plain);
            console.debug("[uiStore] State saved to cache");
        } catch (err) {
            console.error("[uiStore] Failed to save state to cache", err);
        }
    }
    
    // Restore state from localforage
    async function restoreStateFromCache() {
        try {
            const cachedState = await localforage.getItem(CACHE_KEY);
            if (cachedState && typeof cachedState === 'object') {
                const state = cachedState as any;
                
                // Only restore if cache is less than 24 hours old
                const now = Date.now();
                const cacheAge = now - (state.timestamp || 0);
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
                
                if (cacheAge < maxAge) {
                    if (state.bots) bots.value = state.bots;
                    if (state.rooms) rooms.value = state.rooms;
                    if (state.messages) messages.value = state.messages;
                    if (state.selectedBotId) selectedBotId.value = state.selectedBotId;
                    if (state.selectedRoomId) selectedRoomId.value = state.selectedRoomId;
                    if (state.localSettings) localSettings.value = state.localSettings;
                    if (state.unread) unread.value = state.unread;
                    if (state.search) search.value = state.search;
                    if (state.roomFilter) roomFilter.value = state.roomFilter;
                    
                    console.debug("[uiStore] State restored from cache");
                    return true;
                } else {
                    console.debug("[uiStore] Cache too old, ignoring");
                }
            }
        } catch (err) {
            console.error("[uiStore] Failed to restore state from cache", err);
        }
        return false;
    }

    function getApiKey(): string | null {
        try {
            return localStorage.getItem("chatlayer_api_key");
        } catch {
            return null;
        }
    }

    function ensureChat() {
        if (chat) return chat;
        const key = getApiKey();
        if (!key) throw new Error("API key missing");
        chat = new ChatLayer({ apiKey: key, listenerType: "ui" });
        return chat;
    }

    async function loadBots() {
        try {
            const cl = ensureChat();
            const b = await cl.getBots();
            bots.value = Array.isArray(b) ? b : [];
            // auto-select first bot if none selected
            if (!selectedBotId.value && bots.value.length > 0) {
                // choose first and load its rooms
                await selectBot(bots.value[0]);
            }
        } catch (err) {
            console.error("uiStore: loadBots failed", err);
            bots.value = [];
        }
    }

    async function loadRooms(botId?: string) {
        if (!botId) {
            rooms.value = [];
            return;
        }
        try {
            // clear previous rooms immediately so UI shows loading/empty state
            rooms.value = [];
            const cl = ensureChat();
            const params: Parameters<typeof cl.getRooms>[0] = { botId };
            // Add filter params if message type is selected
            if (roomFilter.value.messageType) {
                params.messageType = roomFilter.value.messageType;
                params.depth = roomFilter.value.depth;
            }
            const data = await cl.getRooms(params);
            rooms.value = Array.isArray(data.rooms) ? data.rooms : [];
            // debug log to help trace UI updates
            try {
                // eslint-disable-next-line no-console
                console.debug(`[uiStore] loadRooms(${botId}) -> ${rooms.value.length} rooms`);
            } catch {}
        } catch (err) {
            console.error("uiStore: loadRooms failed", err);
            rooms.value = [];
        }
    }

    function normalizeMessages(arr: Message[] | undefined) {
        if (!arr) return [];
        return arr.map(m => {
            // copy first, then ensure defaults so we don't duplicate keys when spreading
            const base: any = { ...m };
            base.id = base.id || `${base.botId}-${base.roomId || "default"}-${base.createdAt || Date.now()}`;
            base.botId = base.botId;
            base.roomId = base.roomId || "default";
            base.userId = base.userId || base.username || "user";
            base.text = base.text || "";
            base.messageType = base.messageType || "text";
            base.createdAt = base.createdAt || new Date().toISOString();
            return base as Message;
        });
    }

    async function loadMessages(roomId?: string) {
        if (!selectedBotId.value) {
            messages.value = [];
            return;
        }
        if (!roomId) {
            messages.value = [];
            return;
        }
        try {
            const cl = ensureChat();
            const data = await cl.getMessages({ botId: selectedBotId.value, roomId, limit: 20 });
            messages.value = Array.isArray(data) ? normalizeMessages(data) : [];
        } catch (err) {
            console.error("uiStore: loadMessages failed", err);
            messages.value = [];
        }
    }

    // Pagination: load older messages before the given cursorId and merge into store
    async function loadOlderMessages(roomId: string, cursorId?: number | string, types?: string[]) {
        if (!selectedBotId.value) return;
        if (!roomId) return;
        try {
            const cl = ensureChat();
            const params: any = { botId: selectedBotId.value, roomId, limit: 20 };
            if (cursorId !== undefined && cursorId !== null) params.cursorId = cursorId;
            if (types && types.length > 0) params.types = types.join(",");

            const data = await cl.getMessages(params);
            const newRows = Array.isArray(data) ? normalizeMessages(data) : [];
            if (!newRows.length) return;

            // Merge older messages with existing; dedupe by id
            const map = new Map<string | number, any>();
            for (const m of [...newRows, ...messages.value]) {
                const id = (m as any).id ?? `${(m as any).botId}-${(m as any).roomId}-${(m as any).createdAt}`;
                map.set(id as any, m);
            }
            messages.value = Array.from(map.values());
        } catch (err) {
            console.error("uiStore: loadOlderMessages failed", err);
        }
    }

    async function selectBot(botId: string) {
        selectedBotId.value = botId;
        // reset selected room when switching bot
        selectedRoomId.value = undefined;
        // clear messages when switching bot
        messages.value = [];
        await loadRooms(botId);
        // debug
        try {
            // eslint-disable-next-line no-console
            console.debug(`[uiStore] selectBot -> selectedBotId=${selectedBotId.value}, rooms=${rooms.value.length}`);
        } catch {}
        // don't auto-select a room here; wait for user click
    }

    async function selectRoom(roomId: string) {
        selectedRoomId.value = roomId;
        // Clear unread count for this room when selected
        if (selectedBotId.value) {
            const roomKey = `${selectedBotId.value}_${roomId}`;
            unread.value[roomKey] = 0;
        }
        await loadMessages(roomId);
    }

    async function refresh() {
        if (selectedRoomId.value) {
            await loadMessages(selectedRoomId.value);
        } else if (selectedBotId.value) {
            await loadRooms(selectedBotId.value);
        } else {
            await loadBots();
        }
    }

    // Event reaction logic for incoming messages (from ChatLayer longpoll)
    async function onIncomingMessage(m: Message) {
        try {
            // Handle notifications based on notification level setting
            handleNotification(m);
            
            // Track unread messages - only if room is not currently selected
            if (m.botId && m.roomId &&
                !(selectedBotId.value === m.botId && selectedRoomId.value === m.roomId)) {
                const roomKey = `${m.botId}_${m.roomId}`;
                if (!unread.value[roomKey]) {
                    unread.value[roomKey] = 0;
                }
                unread.value[roomKey]++;
            }
            
            // If the message belongs to the currently selected bot -> refresh rooms
            if (m.botId && selectedBotId.value && m.botId === selectedBotId.value) {
                await loadRooms(selectedBotId.value);
            }
            // If the message belongs to the currently selected room -> refresh messages
            if (m.roomId && selectedRoomId.value && m.roomId === selectedRoomId.value) {
                await loadMessages(selectedRoomId.value);
            }
        } catch (err) {
            console.error("uiStore: onIncomingMessage handler error", err);
        }
    }

    // Handle notifications based on notification level setting
    function handleNotification(m: Message) {
        try {
            const notificationLevel = localSettings.value.notificationLevel;
    
            // Skip notifications if level is None
            if (notificationLevel === "None") {
                return;
            }
    
            // Only react to specific message types
            const messageType = String(m.messageType || "text");
            let shouldNotify = false;
            if (notificationLevel === "All") {
                // Only user_message and service_call in All mode
                shouldNotify = messageType === "user_message" || messageType === "service_call";
            } else if (notificationLevel === "ManagerCalls") {
                // Only service_call in ManagerCalls mode
                shouldNotify = messageType === "service_call";
            }
    
            if (!shouldNotify) return;
    
            const title = messageType === "service_call"
                ? t("toast.service_call")
                : t("chat.type.user_message");
    
            const body = m.text || "";
    
            // Show notification with debouncing (notificationManager will suppress when window focused)
            notificationManager.showNotification({
                title,
                body,
                tag: `chatlayer-${m.botId}-${m.roomId}`
            });
        } catch (err) {
            console.error("uiStore: handleNotification error", err);
        }
    }

    // Present an Ionic toast (used when page is visible)
    const presentToast = async (position: "top" | "middle" | "bottom", message = t("toast.service_call")) => {
        try {
            const toast = await toastController.create({
                message,
                duration: 1500,
                position,
            });
            await toast.present();
        } catch (err) {
            console.error("uiStore: presentToast failed", err);
        }
    };

    function startListener() {
        if (started) return;
        try {
            const cl = ensureChat();
            // register onMessage callback
            unsubscribe = cl.onMessage(async (m: Message) => {
                try {
                    // Special handling for service_call messages:
                    // - if page is not visible -> use standard browser alert
                    // - if visible -> present an Ionic toast directly
                    try {
                        const mt = (m && (m.messageType || "text")) as string;
                        if (mt === "service_call") {
                            const text = m.text || t("toast.service_call");
                            if (typeof document !== "undefined" && document.hidden) {
                                try {
                                    // use standard browser alert when page isn't visible
                                    // keep it simple and synchronous
                                    window.alert(text);
                                } catch {}
                            } else {
                                // page visible -> use Ionic toast
                                await presentToast("top", text);
                            }
                        }
                    } catch (innerErr) {
                        console.error("uiStore: service_call notification failed", innerErr);
                    }

                    // still run normal incoming-message handling
                    await onIncomingMessage(m);
                } catch (e) {
                    console.error("uiStore: listener error", e);
                }
            });
            // start longpolling as UI listener (listen to all bots)
            try {
                cl.start({ botIds: null, listenerType: "ui" });
            } catch (e) {
                // ChatLayer.start may throw if misconfigured; still keep onMessage subscription in place
                console.error("uiStore: chat.start threw", e);
            }
            started = true;
        } catch (err) {
            console.error("uiStore: startListener failed", err);
        }
    }

    function stopListener() {
        try {
            if (chat) {
                try {
                    chat.stop();
                } catch {}
            }
            if (unsubscribe) {
                try {
                    unsubscribe();
                } catch {}
                unsubscribe = null;
            }
        } finally {
            started = false;
        }
    }

    // Public init: start listener and load initial bots -> which will auto-select first bot
    async function init() {
        try {
            // Initialize notification manager and request permission
            await notificationManager.requestPermission();
            
            // Try to restore state from cache first
            const restored = await restoreStateFromCache();
            
            // Start listener
            startListener();
            
            // Load bots if not restored from cache or if we need fresh data
            if (!restored) {
                await loadBots();
            } else {
                // Even if restored, we might want to refresh bots to get latest data
                // but keep the selected bot if it exists
                const currentBotId = selectedBotId.value;
                await loadBots();
                // Restore selection if it was lost during refresh
                if (currentBotId && !selectedBotId.value && bots.value.includes(currentBotId)) {
                    await selectBot(currentBotId);
                }
            }
            
            // Load client config for quick answers
            await loadClientConfig();
        } catch (err) {
            console.error("uiStore: init failed", err);
        }
    }
    
    // Add quickAnswers to store state
    const quickAnswers = ref<string[]>([]);
    
    // Load client configuration including quick answers
    async function loadClientConfig() {
        try {
            const cl = ensureChat();
            const config = await cl.getClientConfig();
            if (config.quickAnswersPreset && Array.isArray(config.quickAnswersPreset)) {
                quickAnswers.value = config.quickAnswersPreset;
            }
        } catch (err) {
            console.error("Failed to load client config", err);
        }
    }

    // Set up watchers to trigger cache save on state changes
    watch([bots, rooms, messages, selectedBotId, selectedRoomId, localSettings, unread, search, roomFilter], () => {
        debounceSave();
    }, { deep: true });
    
    // computed getters for convenience
    const filteredMessages = computed(() => {
        if (!selectedBotId.value) return messages.value;
        return messages.value.filter(m => m.botId === selectedBotId.value);
    });

    // Expose quickAnswers getter
    const getQuickAnswers = computed(() => quickAnswers.value);

    return {
        // state
        bots,
        rooms,
        messages,
        selectedBotId,
        selectedRoomId,
        localSettings,
        unread,
        search,
        quickAnswers,
        roomFilter,

        // getters
        filteredMessages,
        isSearchActive,
        searchTokens,
        getQuickAnswers,

        // actions
        init,
        loadBots,
        loadRooms,
        loadMessages,
        loadOlderMessages,
        selectBot,
        selectRoom,
        refresh,
        startListener,
        stopListener,
        loadClientConfig,
        
        // cache functions (exposed for manual control if needed)
        saveStateToCache,
        restoreStateFromCache,
    };
});
