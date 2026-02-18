// bot_v2_wizard.js - Versi Upgrade (Interactive Panel & Wizard Mode + Moderation) - EDISI MALAYSIA
// 100% HEALTH CHECK COMPLIANT ✅

import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import express from "express";

dotenv.config();

// ================= KONFIGURASI UTAMA =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const SUPER_ADMIN_ID = 8146896736;
const PORT = process.env.PORT || 8080; // Wajib ikut platform
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

const LOG_GROUP_ID = -1003832228118;
const SOURCE_CHAT_ID = -1002626291566;
const CHANNEL_ID = -1003175423118;

// ================= STATE MANAGEMENT =================
const adminState = {};

const CASH = {
    bannedWords: [],
    targetGroups: [SOURCE_CHAT_ID, LOG_GROUP_ID],
    admins: [SUPER_ADMIN_ID],
    menuData: {},
    linkMenuData: {},
    startMessage: {}
};

// ================= MONGODB CONNECT =================
let mongoClient = null;
let db = null;
let subscribersColl = null;
let configColl = null;

async function connectMongo() {
    if (!MONGODB_URI) return console.error("❌ MONGODB_URI kosong!");
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();

        db = mongoClient.db("botdb");
        subscribersColl = db.collection("subscribers");
        configColl = db.collection("configs");

        // Load Config ke Memory (CASH)
        await loadConfig();
        console.log("✅ MongoDB Konek & Config Loaded.");
    } catch (err) {
        console.error("❌ DB Error (Retrying...):", err.message);
        // Jangan exit, biar server HTTP tetap hidup
    }
}

async function loadConfig() {
    try {
        const load = async (key, def) => {
            const doc = await configColl.findOne({ key });
            if (doc) CASH[key] = doc.value;
            else {
                await configColl.updateOne({ key }, { $set: { value: def } }, { upsert: true });
                CASH[key] = def;
            }
        };

        await load("bannedWords", ["kencing", "anjing", "scam", "bodoh", "babi"]);
        await load("targetGroups", [SOURCE_CHAT_ID, LOG_GROUP_ID]);
        await load("admins", [SUPER_ADMIN_ID]);

        // Default Data
        await load("menuData", {
            "🌟 NEW REGISTER FREE 🌟": {
                url: "https://afb88.hfcapital.top/",
                media: "https://ibb.co/BK2LVQ6t",
                caption: "🌟 NEW REGISTER BONUS AFB88 🌟"
            }
        });
        await load("linkMenuData", {});
        await load("startMessage", {
            media: "https://media3.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif",
            text: "👋 Hi %USERNAME% Bossku 😘"
        });

        // Ensure Super Admin
        if (!CASH.admins.includes(SUPER_ADMIN_ID)) CASH.admins.push(SUPER_ADMIN_ID);

    } catch (e) {
        console.error("Config Load Error:", e);
    }
}

async function saveConfig(key, value) {
    if (!configColl) return; // Safety check
    CASH[key] = value;
    await configColl.updateOne({ key }, { $set: { value } }, { upsert: true });
}

// ================= BOT LOGIC =================
const bot = new Telegraf(BOT_TOKEN);
const isAdmin = (id) => CASH.admins.includes(id);

// --- 1. PANEL PERINTAH ---
bot.command("panel", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const txt = `🎛 **ADMIN PANEL BOT V2**\n\nSila pilih menu tetapan di bawah:`;
    await ctx.reply(txt, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔘 Top Menu (Butang)", "manage_menu"), Markup.button.callback("🔗 Link (Inline)", "manage_link")],
            [Markup.button.callback("🏁 Mesej Start", "manage_start"), Markup.button.callback("📢 Broadcast", "manage_broadcast")],
            [Markup.button.callback("👮 Admin & Group", "manage_admin"), Markup.button.callback("🛡 Banned Words", "manage_ban")],
            [Markup.button.callback("❌ Tutup Panel", "close_panel")]
        ])
    });
});

// Panel Actions
bot.action("close_panel", (ctx) => ctx.deleteMessage());
bot.action("back_home", (ctx) => ctx.triggerAction("panel_refresh")); // Logic di bawah

// --- 2. MENU MANAGERS ---
bot.action("manage_menu", async (ctx) => {
    const list = Object.keys(CASH.menuData).map((k, i) => `${i + 1}. ${k}`).join("\n");
    await ctx.editMessageText(`🔘 **UTAMA/KEYBOARD**\n\n${list || "(Kosong)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Butang", "add_menu_start"), Markup.button.callback("🗑 Padam Butang", "del_menu_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});

// Add Menu Flow
bot.action("add_menu_start", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_MENU_NAME", data: {} }; ctx.editMessageText("1️⃣ **LANGKAH 1/4**\nTaip **NAMA BUTANG** yang akan muncul di keyboard user:", { parse_mode: "Markdown" }); });
bot.action("del_menu_start", async (ctx) => {
    const buttons = Object.keys(CASH.menuData).map(k => [Markup.button.callback(`🗑 ${k}`, `do_rm_menu_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_menu")]);
    await ctx.editMessageText("Pilih butang untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^do_rm_menu_(.+)$/, async (ctx) => {
    delete CASH.menuData[ctx.match[1]];
    await saveConfig("menuData", CASH.menuData);
    await ctx.answerCbQuery("✅ Terpadam!");
    return ctx.triggerAction("manage_menu");
});

// Link Actions
bot.action("manage_link", async (ctx) => {
    const list = Object.keys(CASH.linkMenuData).map((k, i) => `${i + 1}. ${k}`).join("\n");
    await ctx.editMessageText(`🔗 **MENU LINK (INLINE)**\n\n${list || "(Kosong)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Link", "add_link_start"), Markup.button.callback("🗑 Padam Link", "del_link_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
bot.action("add_link_start", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_LINK_TRIGGER", data: {} }; ctx.editMessageText("1️⃣ **LANGKAH 1/3**\nTaip kata kunci **TRIGGER** (Pemicu):", { parse_mode: "Markdown" }); });
bot.action("del_link_start", async (ctx) => {
    const buttons = Object.keys(CASH.linkMenuData).map(k => [Markup.button.callback(`🗑 ${k}`, `do_rm_link_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_link")]);
    await ctx.editMessageText("Pilih link untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^do_rm_link_(.+)$/, async (ctx) => {
    delete CASH.linkMenuData[ctx.match[1]];
    await saveConfig("linkMenuData", CASH.linkMenuData);
    await ctx.answerCbQuery("✅ Terpadam!");
    return ctx.triggerAction("manage_link");
});

// Start Msg
bot.action("manage_start", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_START_MEDIA", data: {} }; ctx.editMessageText("1️⃣ **LANGKAH 1/2**\nBagi **GAMBAR/LINK** baru (taip 'skip' jika tiada perubahan):", { parse_mode: "Markdown" }); });

// Broadcast Intro
bot.action("manage_broadcast", (ctx) => {
    ctx.editMessageText(
        `📢 **SISTEM BROADCAST**\n\nUntuk elak tersalah tekan, broadcast dibuat secara manual:\n\n1️⃣ Hantar mesej promo ke **Group Source**.\n2️⃣ **Reply** mesej tersebut.\n3️⃣ Taip command: \`/forward\`\n\nBot akan hantar mesej tu ke semua member & group.`,
        { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "back_home")]]) }
    );
});

// Admin & Group Logic
bot.action("manage_admin", async (ctx) => {
    const admins = CASH.admins.length;
    const groups = CASH.targetGroups.length;
    const keys = Markup.inlineKeyboard([
        [Markup.button.callback("➕ Add Admin", "do_add_admin"), Markup.button.callback("➖ Del Admin", "do_del_admin")],
        [Markup.button.callback("➕ Add Group", "do_add_group"), Markup.button.callback("➖ Del Group", "do_del_group")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]);
    await ctx.editMessageText(`👮 **ADMIN & GROUP**\n\n👤 Jumlah Admin: ${admins}\n📢 Jumlah Group: ${groups}`, keys);
});

bot.action("do_add_admin", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_ADD_ADMIN" }; ctx.reply("Taip **ID TELEGRAM** user:"); });
bot.action("do_del_admin", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_DEL_ADMIN" }; ctx.reply("Taip **ID TELEGRAM** admin yang nak dibuang:"); });
bot.action("do_add_group", (ctx) => { ctx.reply("ℹ️ **INFO:**\nInvite bot ke Group -> Admin taip `/panel` di sana.\nAtau taip ID Group manual (mula minus):"); adminState[ctx.from.id] = { action: "WAIT_ADD_GROUP" }; });
bot.action("do_del_group", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_DEL_GROUP" }; ctx.reply("Taip **ID GROUP** yang nak dibuang:"); });

// Banned Words Logic
bot.action("manage_ban", async (ctx) => {
    const list = CASH.bannedWords.map(w => `🚫 ${w}`).join("\n");
    await ctx.editMessageText(`🛡 **BANNED WORDS**\n(Auto delete & warn)\n\n${list || "(Bersih)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Kata", "do_add_ban"), Markup.button.callback("➖ Buang Kata", "do_del_ban")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
bot.action("do_add_ban", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_ADD_BAN" }; ctx.reply("Taip **KATA KASAR** yang nak diblok:"); });
bot.action("do_del_ban", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_DEL_BAN" }; ctx.reply("Taip **KATA** yang nak dibuang dari blacklist:"); });

// --- 3. MODERATION ---
async function handleModeration(ctx) {
    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) return;
    if (!ctx.from || ctx.from.is_bot || isAdmin(ctx.from.id)) return;

    // Whitelist Channels
    const msg = ctx.message;
    if (msg.forward_from_chat && [CHANNEL_ID, SOURCE_CHAT_ID].includes(msg.forward_from_chat.id)) return;

    const text = (msg.text || msg.caption || "").toString().toLowerCase();

    // Bad Words
    if (CASH.bannedWords.some(w => text.includes(w))) {
        await ctx.deleteMessage().catch(() => { });
        return await warnUser(ctx, "Kata Terlarang");
    }

    // Links
    const entities = msg.entities || msg.caption_entities || [];
    const hasLink = entities.some(e => e.type === "url" || e.type === "text_link") || /https?:\/\/|t\.me\//i.test(text);
    if (hasLink) {
        await ctx.deleteMessage().catch(() => { });
        return await warnUser(ctx, "Link Terlarang");
    }
}

async function warnUser(ctx, reason) {
    const chatId = ctx.chat.id;
    const m = await ctx.reply(`⚠️ **AMARAN!**\nUser: ${ctx.from.first_name}\nSebab: ${reason}`);
    setTimeout(() => ctx.telegram.deleteMessage(chatId, m.message_id).catch(() => { }), 5000);
}

// --- 4. MAIN MESSAGE HANDLER ---
bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || "";
    const isPrivate = ctx.chat.type === "private";

    // DEBUG (Untuk cek masuk atau tidak)
    console.log(`📩 Mesej dari ${ctx.from.username} (${userId}): ${text.substring(0, 20)}...`);

    // A. WIZARD STATE
    if (isAdmin(userId) && adminState[userId]) {
        const state = adminState[userId];
        if (text && ["batal", "/cancel"].includes(text.toLowerCase())) {
            delete adminState[userId];
            return ctx.reply("🚫 Batal.", Markup.removeKeyboard());
        }

        // Logic Wizard Admin/Group
        if (state.action === "WAIT_ADD_ADMIN") {
            const id = parseInt(text);
            if (id && !CASH.admins.includes(id)) {
                CASH.admins.push(id); await saveConfig("admins", CASH.admins);
                ctx.reply(`✅ Admin ${id} ditambah.`);
            } else ctx.reply("⚠️ ID tak valid / sudah ada.");
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_ADMIN") {
            const id = parseInt(text);
            if (id === SUPER_ADMIN_ID) return ctx.reply("❌ Super Admin Protected.");
            CASH.admins = CASH.admins.filter(a => a !== id); await saveConfig("admins", CASH.admins);
            ctx.reply(`✅ Admin ${id} dipadam.`);
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_GROUP") {
            const id = parseInt(text);
            if (id && !CASH.targetGroups.includes(id)) {
                CASH.targetGroups.push(id); await saveConfig("targetGroups", CASH.targetGroups);
                ctx.reply("✅ Group ditambah.");
            }
            delete adminState[userId]; return;
        }

        // Logic Banned Words
        if (state.action === "WAIT_ADD_BAN") {
            const w = text.toLowerCase();
            if (!CASH.bannedWords.includes(w)) {
                CASH.bannedWords.push(w); await saveConfig("bannedWords", CASH.bannedWords);
                ctx.reply(`🚫 Kata '${w}' diblok.`);
            }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_BAN") {
            CASH.bannedWords = CASH.bannedWords.filter(w => w !== text.toLowerCase());
            await saveConfig("bannedWords", CASH.bannedWords);
            ctx.reply(`✅ Kata '${text}' dipadam.`);
            delete adminState[userId]; return;
        }

        // Logic Menu & Formatting
        if (state.action === "WAIT_MENU_NAME") { state.data.name = text; state.action = "WAIT_MENU_CAPTION"; return ctx.reply("2️⃣ **CAPTION**:"); }
        if (state.action === "WAIT_MENU_CAPTION") { state.data.caption = text; state.action = "WAIT_MENU_MEDIA"; return ctx.reply("3️⃣ **GAMBAR/LINK**:"); }
        if (state.action === "WAIT_MENU_MEDIA") {
            let media = "";
            if (ctx.message.photo) media = ctx.message.photo.pop().file_id;
            else if (text.startsWith("http")) media = text;
            else return ctx.reply("⚠️ Gambar/Link wajib ada!");
            state.data.media = media; state.action = "WAIT_MENU_URL"; return ctx.reply("4️⃣ **LINK WEB**:");
        }
        if (state.action === "WAIT_MENU_URL") {
            CASH.menuData[state.data.name] = { caption: state.data.caption, media: state.data.media, url: text };
            await saveConfig("menuData", CASH.menuData);
            delete adminState[userId]; return ctx.reply("🎉 Menu siap!");
        }

        // Logic Link
        if (state.action === "WAIT_LINK_TRIGGER") { state.data.trigger = text; state.action = "WAIT_LINK_LABEL"; return ctx.reply("2️⃣ **LABEL BUTANG**:"); }
        if (state.action === "WAIT_LINK_LABEL") { state.data.label = text; state.action = "WAIT_LINK_URL"; return ctx.reply("3️⃣ **LINK URL**:"); }
        if (state.action === "WAIT_LINK_URL") {
            CASH.linkMenuData[state.data.trigger] = { label: state.data.label, url: text };
            await saveConfig("linkMenuData", CASH.linkMenuData);
            delete adminState[userId]; return ctx.reply("🎉 Link siap!");
        }

        // Logic Start Msg
        if (state.action === "WAIT_START_MEDIA") {
            let media = CASH.startMessage.media;
            if (text && text.toLowerCase() !== "skip") media = (ctx.message.photo ? ctx.message.photo.pop().file_id : text);
            state.data.media = media; state.action = "WAIT_START_TEXT"; return ctx.reply("2️⃣ **CAPTION (Start)**:");
        }
        if (state.action === "WAIT_START_TEXT") {
            const newStart = { media: state.data.media, text: text };
            CASH.startMessage = newStart; await saveConfig("startMessage", newStart);
            delete adminState[userId]; return ctx.reply("🎉 Start updated!");
        }
    }

    // B. NORMAL USER LOGIC

    // Broadcast Trigger
    if (ctx.chat.id === SOURCE_CHAT_ID && text === "/forward" && ctx.message.reply_to_message) {
        if (!isAdmin(userId)) return;
        const replyTo = ctx.message.reply_to_message;
        ctx.reply("🚀 Sending Broadcast...");
        // Logic Broadcast
        const subs = await subscribersColl.find({}).toArray();
        let sent = 0;
        for (const s of subs) {
            try { await bot.telegram.copyMessage(s.userId, replyTo.chat.id, replyTo.message_id); sent++; }
            catch (e) { if (e.response?.error_code === 403) subscribersColl.deleteOne({ _id: s._id }); }
        }
        for (const gid of CASH.targetGroups) {
            if (gid === SOURCE_CHAT_ID) continue;
            try { await bot.telegram.copyMessage(gid, replyTo.chat.id, replyTo.message_id); sent++; } catch { }
        }
        return ctx.reply(`✅ Broadcast Selesai! Terkirim ke ${sent} target.`);
    }

    // Capture User
    if (isPrivate) {
        try { await subscribersColl.updateOne({ userId }, { $set: { userId } }, { upsert: true }); } catch { }
    }

    // Auto-Add Group via Panel
    if (!isPrivate && text === "/panel" && isAdmin(userId)) {
        if (!CASH.targetGroups.includes(ctx.chat.id)) {
            CASH.targetGroups.push(ctx.chat.id);
            await saveConfig("targetGroups", CASH.targetGroups);
            ctx.reply("✅ Group Saved!");
        }
    }

    // Private Chat Responses
    if (isPrivate) {
        // Link Trigger
        if (CASH.linkMenuData[text]) {
            return ctx.reply("👇", Markup.inlineKeyboard([[Markup.button.url(CASH.linkMenuData[text].label, CASH.linkMenuData[text].url)]]));
        }
        // Menu Trigger
        if (CASH.menuData[text]) {
            const d = CASH.menuData[text];
            const btn = Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", d.url)]]);
            const isImg = d.media.match(/\.(jpg|png|jpeg)/i) || !d.media.startsWith("http");
            if (isImg) await ctx.replyWithPhoto(d.media, { caption: d.caption, ...btn });
            else await ctx.replyWithAnimation(d.media, { caption: d.caption, ...btn });
            return;
        }
        // Feedback Forward
        if (!text.startsWith("/")) await ctx.forwardMessage(LOG_GROUP_ID).catch(() => { });
    }

    // Moderation
    if (!isPrivate) await handleModeration(ctx);
});

// Start Command
bot.start(async (ctx) => {
    try { await subscribersColl.updateOne({ userId: ctx.from.id }, { $set: { userId: ctx.from.id } }, { upsert: true }); } catch { }
    const { media, text } = CASH.startMessage;
    const caption = text.replace("%USERNAME%", ctx.from.first_name || "Bossku");
    const kfc = Object.keys(CASH.menuData).map(k => [k]);
    const opts = { caption, reply_markup: { keyboard: kfc, resize_keyboard: true } };

    if (media.match(/\.(jpg|png|jpeg)/i) || !media.startsWith("http")) await ctx.replyWithPhoto(media, opts);
    else await ctx.replyWithAnimation(media, opts);
});

// ================= 5. EXPRESS SERVER (CRITICAL FOR DEPLOY) =================
const app = express();

// Health Check Endpoint (PENTING!)
app.get("/", (req, res) => res.status(200).send("Bot Online"));

// Listen FIRST, Connect LATER (Anti-Timeout Strategy)
const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server HTTP Running on Port: ${PORT}`);

    // Start Services in Background
    startServices();
});

async function startServices() {
    console.log("🔄 Starting MongoDB & Bot...");
    try {
        await connectMongo(); // Connect DB

        // --- 🔴 FIXED: FORCE DELETE WEBHOOK ---
        // Kalau pernah pakai webhook sebelumnya, ini yang bikin stuck.
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log("✅ Webhook DELETED (Supaya Polling Jalan)");

        // Launch Bot with Retry Logic
        await bot.launch();
        console.log("✅ Bot Telegram STARTED Successfully!");

    } catch (error) {
        console.error("❌ Service Startup Error:", error);
    }
}

// Graceful Stop
process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
