// bot_v2_wizard.js - Versi Upgrade (Interactive Panel & Wizard Mode + Moderation) - EDISI MALAYSIA
// 100% HEALTH CHECK COMPLIANT + SUPER DEBUGGER ✅

import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import express from "express";
import http from "http";

dotenv.config();

// ================= KONFIGURASI UTAMA =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const SUPER_ADMIN_ID = 8146896736;
const PORT = process.env.PORT || 8080;
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

const LOG_GROUP_ID = -1003832228118; // Group Log Chat
const ADMIN_LOG_GROUP_ID = -1003757875020; // Group Khusus Notif Sub & Error
const SOURCE_CHAT_ID = -1002626291566;
const CHANNEL_ID = -1003175423118;
const CHANNEL_USERNAME = "AFB88_OFFICIAL"; // Ganti dengan username channel tanpa @

// ================= STATE MANAGEMENT =================
const adminState = {};
const CASH = {
    bannedWords: [],
    targetGroups: [SOURCE_CHAT_ID, LOG_GROUP_ID],
    admins: [SUPER_ADMIN_ID],
    menuData: {},
    linkMenuData: {},
    startMessage: {},
    menuTitle: "👇 Sila Pilih Menu Utama:" // Default Title
};

// Undo/Rollback Storage (Temporary Memory)
let LAST_BROADCAST = [];

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

        await loadConfig();
        console.log("✅ MongoDB Konek & Config Loaded.");
    } catch (err) {
        console.error("❌ DB Error (Retrying...):", err.message);
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

        await load("menuData", {
            "🌟 NEW REGISTER FREE 🌟": {
                url: "https://afb88.hfcapital.top/",
                media: "https://ibb.co/BK2LVQ6t",
                caption: "🌟 NEW REGISTER BONUS AFB88 🌟",
                btnLabel: "TEKAN SINI / CLICK HERE 🎁"
            },
            "STEP 1": {
                url: "https://afb88.hfcapital.top/",
                media: "https://ibb.co/BK2LVQ6t",
                caption: "🌟 DETAILS UNTUK STEP 1 🌟",
                btnLabel: "TEKAN SINI / CLICK HERE 🎁"
            }
        });

        // --- FORCE UPDATE/MERGE DEFAULTS (MIGRATION PATCH) --- 
        let dirty = false;

        // 1. Fix "STEP 1" & "NEW REGISTER" (Ensure position property exists)
        for (const key in CASH.menuData) {
            const item = CASH.menuData[key];
            if (!item.position) {
                // Default logic: "STEP" -> Inline, Others -> Keyboard
                item.position = key.toUpperCase().includes("STEP") ? 'inline' : 'keyboard';
                dirty = true;
            }
        }

        if (dirty) {
            console.log("✅ Auto-Migration: Database Updated with Menu Positions!");
            await saveConfig("menuData", CASH.menuData);
        }
        // -----------------------------------------------------

        await load("linkMenuData", {});

        await load("startMessage", {
            media: "https://media.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif", // GIF default
            text: "👋 Hi %USERNAME% Bossku 😘"
        });

        await load("menuTitle", "Step Free Cuci Free Ambik Sini ⬇️");

        if (!CASH.admins.includes(SUPER_ADMIN_ID)) CASH.admins.push(SUPER_ADMIN_ID);

    } catch (e) {
        console.error("Config Load Error:", e);
    }
}

async function saveConfig(key, value) {
    if (!configColl) return;
    CASH[key] = value;
    await configColl.updateOne({ key }, { $set: { value } }, { upsert: true });
}

// ================= BOT LOGIC =================
const bot = new Telegraf(BOT_TOKEN);
const isAdmin = (id) => CASH.admins.includes(id);

// --- 0. GLOBAL MIDDLEWARE & DEBUGGER ---
bot.use(async (ctx, next) => {
    // Log setiap update
    if (ctx.updateType === 'message') {
        const user = ctx.from.username || ctx.from.first_name || "Unknown";
        console.log(`📩 INCOMING MSG [${user}]: ${ctx.message.text || ctx.message.caption || "Media"}`);
    }



    await next();
});

// Callback untuk Check Sub (Jika sudah join, user tekan ini)


// Catch Errors
bot.catch((err, ctx) => {
    console.error(`❌ Telegraf Error for ${ctx.updateType}:`, err);
});

// =================== WELCOME MESSAGE (NEW MEMBER) ===================
bot.on("new_chat_members", async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    for (const member of newMembers) {
        if (member.is_bot) continue;
        const name = member.first_name || "Bossku";

        const welcomeText = `
👋 **SELAMAT DATANG / WELCOME** ${name}!

🇲🇾 Selamat datang ke Group Official kami! Sila baca rules & enjoy.
🇬🇧 Welcome to our Official Group! Please read the rules & enjoy.

🚀 *Jangan lupa check Pinned Message!*
`;
        try {
            const m = await ctx.reply(welcomeText, { parse_mode: "Markdown" });
            // Auto Delete after 30 seconds
            setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 30000);
        } catch (e) { }
    }
});

// =================== START COMMAND ===================
bot.start(async (ctx) => {
    console.log("⚡ PROCESSING /START...");
    try {
        const userCount = await subscribersColl.countDocuments({ userId: ctx.from.id });
        if (userCount === 0) {
            await subscribersColl.updateOne({ userId: ctx.from.id }, { $set: { userId: ctx.from.id, name: ctx.from.first_name } }, { upsert: true });

            // Notif New Subscriber ke Admin Log Group
            const notifText = `🎉 **NEW SUBSCRIBER**\nName: ${ctx.from.first_name}\nID: \`${ctx.from.id}\``;
            await bot.telegram.sendMessage(ADMIN_LOG_GROUP_ID, notifText, { parse_mode: "Markdown" }).catch(() => { });
        }
    } catch (e) { console.error("Sub Error:", e); }

    let { media, text } = CASH.startMessage;
    // Fallback if media broken
    if (!media) media = "https://media.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif";

    // Buat nama jadi Link (Warna Biru)
    const nameLink = `[${ctx.from.first_name || "Bossku"}](tg://user?id=${ctx.from.id})`;

    let caption = text;
    if (caption.includes("%USERNAME%")) {
        caption = caption.replace("%USERNAME%", nameLink);
    } else {
        // Jika placeholder tidak ada, paksa tambah nama di awal
        caption = `👋 Hi ${nameLink}!\n\n${caption}`;
    }

    // A. SIAPKAN INLINE BUTTONS (Dari Link Menu)
    const inlineButtons = Object.entries(CASH.linkMenuData).map(([k, d]) => {
        // Support Link (URL) & Post (Message)
        if (d.type === 'post') return Markup.button.callback(d.label, `trig_inline_${k}`);
        return Markup.button.url(d.label, d.url);
    });
    const inlineKbd = inlineButtons.length > 0 ? Markup.inlineKeyboard(inlineButtons, { columns: 2 }) : null;

    // B. SIAPKAN KEYBOARDS (Separated: Inline vs Reply)
    // - Item "STEP" masuk ke Inline Button (Bawah Title)
    // - Item Lain (Contoh: NEW REGISTER) kekal di Reply Keyboard (Bawah Skrin)
    const allMenuKeys = Object.keys(CASH.menuData);
    const inlineMenuKeys = allMenuKeys.filter(k => CASH.menuData[k].position === 'inline');
    const replyMenuKeys = allMenuKeys.filter(k => CASH.menuData[k].position !== 'inline'); // Default to keyboard if undefined

    // 1. Inline Keyboard (Untuk Title Message)
    const menuButtons = inlineMenuKeys.map(k => [Markup.button.callback(k, `trig_menu_${k}`)]);
    const menuInlineKbd = Markup.inlineKeyboard(menuButtons);

    // 2. Reply Keyboard (Untuk Menu Utama Bawah)
    const kfc = replyMenuKeys.map(k => [k]);
    const replyKbd = { keyboard: kfc, resize_keyboard: true };

    // 3. TRY TO REPLY (MESSAGE HEADER - GAMBAR START)
    try {
        // Kirim Gambar + Inline Buttons (Link Menu)
        if (media.match(/\.(jpg|png|jpeg)/i) || !media.startsWith("http")) {
            await ctx.replyWithPhoto(media, { caption, parse_mode: "Markdown", ...inlineKbd });
        } else {
            await ctx.replyWithAnimation(media, { caption, parse_mode: "Markdown", ...inlineKbd });
        }
    } catch (e) {
        console.error("❌ START REPLY ERROR (MEDIA):", e.message);
        // Fallback Text Only + Inline
        await ctx.reply(caption, { parse_mode: "Markdown", ...inlineKbd });
    }

    // DISINI PERUBAHANNYA:
    // 1. Title Message ("Step Free...") dengan Inline Button "STEP 1"
    // Callback 'trig_menu_' akan handle logic yang SAMA persis seperti keyboard biasa
    await ctx.reply(CASH.menuTitle || "Step Free Cuci Free Ambik Sini ⬇️", { parse_mode: "Markdown", ...menuInlineKbd });

    // 2. Reply Keyboard ("NEW REGISTER") dikirim terpisah supaya tetap muncul di bawah
    if (replyMenuKeys.length > 0) {
        await ctx.reply("👇 Menu Utama:", { reply_markup: replyKbd });
    }
});

// --- 1. PANEL PERINTAH (BAHASA MALAYSIA) ---
bot.command("panel", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const txt = `🎛 **PANEL ADMIN BOT V2**\n\nSila pilih menu tetapan di bawah:`;
    await ctx.reply(txt, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔘 Menu Utama (Butang)", "manage_menu"), Markup.button.callback("🔗 Link (Inline)", "manage_link")],
            [Markup.button.callback("🏁 Mesej Start & Title", "manage_start"), Markup.button.callback("📢 Sistem Broadcast", "manage_broadcast")],
            [Markup.button.callback("👮 Urus Admin & Group", "manage_admin"), Markup.button.callback("🛡 Senarai Kata Terlarang", "manage_ban")],
            [Markup.button.callback("❌ Tutup Panel", "close_panel")]
        ])
    });
});
bot.action("close_panel", (ctx) => ctx.deleteMessage());
bot.action("back_home", (ctx) => ctx.triggerAction("panel_refresh"));

// --- 2. MENU MANAGERS ---
bot.action("manage_menu", async (ctx) => {
    const list = Object.keys(CASH.menuData).map((k, i) => `${i + 1}. ${k}`).join("\n");
    await ctx.editMessageText(`🔘 **MENU UTAMA/KEYBOARD**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Butang", "add_menu_start"), Markup.button.callback("🗑 Padam Butang", "del_menu_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
// Add/Del Menu Logic
bot.action("add_menu_start", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_MENU_NAME", data: {} }; ctx.editMessageText("1️⃣ **LANGKAH 1/5**\nSila taip **NAMA BUTANG**:", { parse_mode: "Markdown" }); });
bot.action("del_menu_start", async (ctx) => {
    const buttons = Object.keys(CASH.menuData).map(k => [Markup.button.callback(`🗑 ${k}`, `do_rm_menu_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_menu")]);
    await ctx.editMessageText("Sila pilih butang untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^do_rm_menu_(.+)$/, async (ctx) => {
    delete CASH.menuData[ctx.match[1]]; await saveConfig("menuData", CASH.menuData);
    await ctx.answerCbQuery("✅ Berjaya dipadam!"); return ctx.triggerAction("manage_menu");
});

// Link Logic
// Link/Header Menu Logic
bot.action("manage_link", async (ctx) => {
    const list = Object.keys(CASH.linkMenuData).map((k, i) => `${i + 1}. ${CASH.linkMenuData[k].label}`).join("\n");
    await ctx.editMessageText(`🔗 **MENU LINK (HEADER)**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Menu", "add_link_start"), Markup.button.callback("🗑 Padam Menu", "del_link_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});

bot.action("add_link_start", (ctx) => {
    adminState[ctx.from.id] = { action: "WAIT_LINK_KEY", data: {} };
    ctx.editMessageText("1️⃣ **LANGKAH 1/4**\nSila taip **ID UNIK** (Cth: promo1, link2):", { parse_mode: "Markdown" });
});

bot.action("del_link_start", async (ctx) => {
    const buttons = Object.keys(CASH.linkMenuData).map(k => [Markup.button.callback(`🗑 ${CASH.linkMenuData[k].label}`, `do_rm_link_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_link")]);
    await ctx.editMessageText("Sila pilih menu untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^do_rm_link_(.+)$/, async (ctx) => {
    delete CASH.linkMenuData[ctx.match[1]]; await saveConfig("linkMenuData", CASH.linkMenuData);
    await ctx.answerCbQuery("✅ Berjaya dipadam!"); return ctx.triggerAction("manage_link");
});

// Handler untuk Inline Click (Post Type)
bot.action(/^trig_inline_(.+)$/, async (ctx) => {
    const k = ctx.match[1];
    const d = CASH.linkMenuData[k];
    if (!d) return ctx.answerCbQuery("❌ Menu tidak dijumpai.");

    const btnLabel = d.btnLabel || "TEKAN SINI / CLICK HERE 🎁";
    const btn = Markup.inlineKeyboard([[Markup.button.url(btnLabel, d.url)]]);
    try {
        if (d.media.match(/\.(jpg|png|jpeg)/i) || !d.media.startsWith("http")) await ctx.replyWithPhoto(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
        else await ctx.replyWithAnimation(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
    } catch (e) {
        await ctx.reply(d.caption, { parse_mode: "Markdown", ...btn });
    }
    await ctx.answerCbQuery();
});

// Handler untuk Menu Utama (Inline Click) - NEW HANDLER
bot.action(/^trig_menu_(.+)$/, async (ctx) => {
    const k = ctx.match[1];
    const d = CASH.menuData[k];
    if (!d) return ctx.answerCbQuery("❌ Menu tidak dijumpai/telah dipadam.");

    const btnLabel = d.btnLabel || "TEKAN SINI / CLICK HERE 🎁";
    const btn = Markup.inlineKeyboard([[Markup.button.url(btnLabel, d.url)]]);

    try {
        // Send as new message (Reply)
        if (d.media.match(/\.(jpg|png|jpeg)/i) || !d.media.startsWith("http"))
            await ctx.replyWithPhoto(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
        else
            await ctx.replyWithAnimation(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
    } catch (e) {
        await ctx.reply(d.caption, { parse_mode: "Markdown", ...btn });
    }
    await ctx.answerCbQuery();
});

// Start & Broadcast
// --- MODIFIED START MANAGER ---
bot.action("manage_start", (ctx) => {
    ctx.editMessageText(
        `🏁 **TETAPAN MESEJ & TITLE**\nSila pilih bahagian yang ingin diubah:`,
        Markup.inlineKeyboard([
            [Markup.button.callback("🖼 Ubah Mesej Start", "do_chg_start_msg")],
            [Markup.button.callback("🔤 Ubah Menu Title", "do_chg_title")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    );
});

bot.action("do_chg_start_msg", (ctx) => {
    adminState[ctx.from.id] = { action: "WAIT_START_MEDIA", data: {} };
    ctx.editMessageText("1️⃣ **LANGKAH 1/2**\nSila hantar **GAMBAR/LINK** baru:\n_(Taip 'skip' untuk kekalkan gambar lama)_", { parse_mode: "Markdown" });
});

bot.action("do_chg_title", async (ctx) => {
    const lines = (CASH.menuTitle || "").split("\n").filter(x => x.trim());
    const displayList = lines.map((l, i) => `${i + 1}. ${l}`).join("\n");

    await ctx.editMessageText(
        `🔤 **URUS MENU TITLE (TEXT)**\n\n${displayList || "(Tiada Text)"}`,
        Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Baris", "add_title_line"), Markup.button.callback("🗑 Padam Baris", "del_title_line")],
            [Markup.button.callback("🔙 Kembali", "manage_start")]
        ])
    );
});

bot.action("add_title_line", (ctx) => {
    adminState[ctx.from.id] = { action: "WAIT_ADD_TITLE_LINE" };
    ctx.editMessageText("➕ **TAMBAH BARIS**\nSila taip teks untuk baris baru:", { parse_mode: "Markdown" });
});

bot.action("del_title_line", async (ctx) => {
    const lines = (CASH.menuTitle || "").split("\n").filter(x => x.trim());
    const buttons = lines.map((l, i) => [Markup.button.callback(`🗑 ${l.substring(0, 20)}...`, `rm_title_line_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "do_chg_title")]);
    await ctx.editMessageText("Sila pilih baris untuk dipadam:", Markup.inlineKeyboard(buttons));
});

bot.action(/^rm_title_line_(\d+)$/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    let lines = (CASH.menuTitle || "").split("\n").filter(x => x.trim());
    if (lines[idx] !== undefined) {
        lines.splice(idx, 1);
        CASH.menuTitle = lines.join("\n");
        await saveConfig("menuTitle", CASH.menuTitle);
        await ctx.answerCbQuery("✅ Baris dipadam!");
    }
    return ctx.triggerAction("do_chg_title");
});
// ------------------------------

bot.action("manage_broadcast", (ctx) => {
    ctx.editMessageText(`📢 **SISTEM BROADCAST**\n1️⃣ Hantar promo ke **Group Asal (Source)**\n2️⃣ **Reply** mesej tersebut\n3️⃣ Taip command: \`/forward\`\n\n(❗️ Taip \`/undo\` jika tersalah hantar)`, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "back_home")]]) });
});

// Admin & Ban Logic
bot.action("manage_admin", async (ctx) => {
    await ctx.editMessageText(`👮 **URUS ADMIN & GROUP**\n👤 Jumlah Admin: ${CASH.admins.length}\n📢 Jumlah Group: ${CASH.targetGroups.length}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Admin", "do_add_admin"), Markup.button.callback("➖ Buang Admin", "do_del_admin")],
        [Markup.button.callback("➕ Tambah Group", "do_add_group"), Markup.button.callback("➖ Buang Group", "do_del_group")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
bot.action("do_add_admin", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_ADD_ADMIN" }; ctx.reply("Sila taip ID User:"); });
bot.action("do_del_admin", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_DEL_ADMIN" }; ctx.reply("Sila taip ID User:"); });
bot.action("do_add_group", (ctx) => { ctx.reply("Sila taip ID Group:"); adminState[ctx.from.id] = { action: "WAIT_ADD_GROUP" }; });
bot.action("do_del_group", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_DEL_GROUP" }; ctx.reply("Sila taip ID Group:"); });

bot.action("manage_ban", async (ctx) => {
    await ctx.editMessageText(`🛡 **SENARAI KATA TERLARANG**\n${CASH.bannedWords.map(w => `🚫 ${w}`).join("\n")}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Kata", "do_add_ban"), Markup.button.callback("➖ Buang Kata", "do_del_ban")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
bot.action("do_add_ban", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_ADD_BAN" }; ctx.reply("Sila taip Kata:"); });
bot.action("do_del_ban", (ctx) => { adminState[ctx.from.id] = { action: "WAIT_DEL_BAN" }; ctx.reply("Sila taip Kata:"); });

// --- 3. MODERATION ---
async function handleModeration(ctx) {
    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) return;
    if (!ctx.from || ctx.from.is_bot || isAdmin(ctx.from.id)) return;
    const msg = ctx.message;
    if (msg.forward_from_chat && [CHANNEL_ID, SOURCE_CHAT_ID].includes(msg.forward_from_chat.id)) return;
    const text = (msg.text || msg.caption || "").toString().toLowerCase();

    if (CASH.bannedWords.some(w => text.includes(w))) {
        await ctx.deleteMessage().catch(() => { });
        return await warnUser(ctx, "Penggunaan Kata Terlarang");
    }
    const hasLink = (msg.entities || msg.caption_entities || []).some(e => e.type === "url" || e.type === "text_link") || /https?:\/\/|t\.me\//i.test(text);
    if (hasLink) {
        await ctx.deleteMessage().catch(() => { });
        return await warnUser(ctx, "Link Tidak Dibenarkan");
    }
}
async function warnUser(ctx, reason) {
    const m = await ctx.reply(`⚠️ **AMARAN!**\nNama: ${ctx.from.first_name}\nSebab: ${reason}`);
    setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 5000);
}

// --- 4. MESSAGE HANDLER ---
bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || "";
    const isPrivate = ctx.chat.type === "private";

    // A. ADMIN WIZARD
    if (isAdmin(userId) && adminState[userId]) {
        const state = adminState[userId];
        if (text && ["batal", "/cancel"].includes(text.toLowerCase())) { delete adminState[userId]; return ctx.reply("🚫 Tindakan dibatalkan.", Markup.removeKeyboard()); }

        // Admin Logic
        if (state.action === "WAIT_ADD_ADMIN") {
            const id = parseInt(text); if (id && !CASH.admins.includes(id)) { CASH.admins.push(id); await saveConfig("admins", CASH.admins); ctx.reply("✅ Admin berjaya ditambah."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_ADMIN") {
            const id = parseInt(text); if (id !== SUPER_ADMIN_ID) { CASH.admins = CASH.admins.filter(a => a !== id); await saveConfig("admins", CASH.admins); ctx.reply("✅ Admin berjaya dibuang."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_GROUP") {
            const id = parseInt(text); if (id && !CASH.targetGroups.includes(id)) { CASH.targetGroups.push(id); await saveConfig("targetGroups", CASH.targetGroups); ctx.reply("✅ Group berjaya ditambah."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_BAN") {
            const w = text.toLowerCase(); if (!CASH.bannedWords.includes(w)) { CASH.bannedWords.push(w); await saveConfig("bannedWords", CASH.bannedWords); ctx.reply("✅ Kata berjaya ditambah."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_BAN") {
            CASH.bannedWords = CASH.bannedWords.filter(w => w !== text.toLowerCase()); await saveConfig("bannedWords", CASH.bannedWords); ctx.reply("✅ Kata berjaya dibuang.");
            delete adminState[userId]; return;
        }

        // Menu Logic
        if (state.action === "WAIT_MENU_NAME") { state.data.name = text; state.action = "WAIT_MENU_CAPTION"; return ctx.reply("2️⃣ **CAPTION**:"); }
        if (state.action === "WAIT_MENU_CAPTION") { state.data.caption = text; state.action = "WAIT_MENU_MEDIA"; return ctx.reply("3️⃣ **GAMBAR/LINK**:"); }
        if (state.action === "WAIT_MENU_MEDIA") {
            state.data.media = (ctx.message.photo ? ctx.message.photo.pop().file_id : text); state.action = "WAIT_MENU_URL"; return ctx.reply("4️⃣ **LINK WEB**:");
        }
        if (state.action === "WAIT_MENU_URL") {
            state.data.url = text; state.action = "WAIT_MENU_BTN_LABEL"; return ctx.reply("5️⃣ **LABEL BUTANG** (Teks pada butang link):\n_(Cth: CLAIM SINI, REGISTER NOW)_");
        }
        if (state.action === "WAIT_MENU_BTN_LABEL") {
            state.data.btnLabel = text;
            state.action = "WAIT_MENU_POSITION";
            return ctx.reply("6️⃣ **POSISI BUTANG**:\n\nSila pilih:\n1. **INLINE** (Di bawah Title/Gambar)\n2. **KEYBOARD** (Di bawah skrin)", Markup.keyboard([["1. INLINE"], ["2. KEYBOARD"]]).oneTime().resize());
        }
        if (state.action === "WAIT_MENU_POSITION") {
            const pos = text.toUpperCase().includes("INLINE") ? 'inline' : 'keyboard';
            CASH.menuData[state.data.name] = {
                caption: state.data.caption,
                media: state.data.media,
                url: state.data.url,
                btnLabel: state.data.btnLabel,
                position: pos
            };
            await saveConfig("menuData", CASH.menuData);
            ctx.reply(`🎉 Butang '${state.data.name}' berjaya disimpan di posisi ${pos.toUpperCase()}!`, Markup.removeKeyboard());
            delete adminState[userId];
            return;
        }

        // Link Logic
        // Link Wizard (UPDATED)
        if (state.action === "WAIT_LINK_KEY") { title = text.replace(/\s+/g, '_'); state.data.trigger = title; state.action = "WAIT_LINK_LABEL"; return ctx.reply(`🆔 ID: ${title}\n\n2️⃣ Sila taip **LABEL** (Nama pada butang):`); }
        if (state.action === "WAIT_LINK_LABEL") {
            state.data.label = text;
            state.action = "WAIT_LINK_TYPE";
            return ctx.reply("3️⃣ **PILIH JENIS:**\n\n🔗 **LINK** (Buka Web Terus)\n🖼 **POST** (Keluar Gambar & Caption)", Markup.keyboard([["🔗 LINK"], ["🖼 POST"]]).oneTime().resize());
        }
        if (state.action === "WAIT_LINK_TYPE") {
            const type = text.includes("POST") ? "post" : "url";
            state.data.type = type;
            if (type === "url") {
                state.action = "WAIT_LINK_FINAL_URL";
                return ctx.reply("4️⃣ Masukkan **URL DESTINASI**:", Markup.removeKeyboard());
            } else {
                state.action = "WAIT_LINK_CAPTION";
                return ctx.reply("4️⃣ Masukkan **CAPTION** (Ayat promosi):", Markup.removeKeyboard());
            }
        }
        if (state.action === "WAIT_LINK_FINAL_URL") {
            CASH.linkMenuData[state.data.trigger] = { label: state.data.label, url: text, type: 'url' };
            await saveConfig("linkMenuData", CASH.linkMenuData);
            delete adminState[userId];
            return ctx.reply("🎉 Menu Link (URL) berjaya disimpan!");
        }
        // Branch Post
        if (state.action === "WAIT_LINK_CAPTION") { state.data.caption = text; state.action = "WAIT_LINK_MEDIA"; return ctx.reply("5️⃣ Masukkan **GAMBAR/GIF**:"); }
        if (state.action === "WAIT_LINK_MEDIA") {
            state.data.media = (ctx.message.photo ? ctx.message.photo.pop().file_id : text);
            state.action = "WAIT_LINK_BTN_LABEL_CUSTOM";
            return ctx.reply("6️⃣ Pasang **LABEL TOMBOL**:\n_(Cth: ORDER NOW, LIHAT PROMO)_");
        }
        if (state.action === "WAIT_LINK_BTN_LABEL_CUSTOM") {
            state.data.btnLabel = text;
            state.action = "WAIT_LINK_BTN_URL";
            return ctx.reply("7️⃣ Masukkan **LINK TUJUAN** (URL):");
        }
        if (state.action === "WAIT_LINK_BTN_URL") {
            CASH.linkMenuData[state.data.trigger] = {
                type: 'post', label: state.data.label,
                caption: state.data.caption, media: state.data.media,
                url: text, btnLabel: state.data.btnLabel
            };
            await saveConfig("linkMenuData", CASH.linkMenuData);
            delete adminState[userId];
            return ctx.reply("🎉 Menu Link (POST) berjaya disimpan!");
        }

        // Start Msg (MODIFIED)
        if (state.action === "WAIT_START_MEDIA") {
            state.data.media = (text.toLowerCase() === "skip" ? CASH.startMessage.media : (ctx.message.photo ? ctx.message.photo.pop().file_id : text));
            state.action = "WAIT_START_TEXT"; return ctx.reply("2️⃣ **TEXT** (Caption / Kata-kata):");
        }
        if (state.action === "WAIT_START_TEXT") {
            state.data.text = text;
            CASH.startMessage = { media: state.data.media, text: state.data.text };
            await saveConfig("startMessage", CASH.startMessage);
            delete adminState[userId];
            return ctx.reply("🎉 Mesej Start berjaya dikemaskini!");
        }

        // Menu Title (NEW LIST MODE)
        if (state.action === "WAIT_ADD_TITLE_LINE") {
            const current = CASH.menuTitle ? CASH.menuTitle + "\n" : "";
            CASH.menuTitle = current + text;
            await saveConfig("menuTitle", CASH.menuTitle);
            delete adminState[userId];
            return ctx.reply("🎉 Baris berjaya ditambah! Tekan /panel untuk urus lagi.");
        }
    }

    // B. REPLY SYSTEM (ADMIN -> USER)
    // Jika admin reply pesan forward di LOG_GROUP_ID, kirim balik ke user
    if ((ctx.chat.id === LOG_GROUP_ID || ctx.chat.id === SOURCE_CHAT_ID) && ctx.message.reply_to_message && isAdmin(userId)) {
        // Cek apakah pesan yg di-reply adalah Forwarded User
        const targetId = ctx.message.reply_to_message.forward_from ? ctx.message.reply_to_message.forward_from.id : null;

        if (targetId) {
            try {
                await bot.telegram.copyMessage(targetId, ctx.chat.id, ctx.message.message_id);
                await ctx.reply("✅ Pesan terkirim ke User!");
            } catch (e) {
                await ctx.reply("❌ Gagal kirim: User mungkin block bot.");
            }
        } else {
            // Jika tidak ada forward_from (Privacy User ON), cannot reply directly
            // Opsional: Cek caption/text jika ada pattern ID manual (Advanced)
        }
        // Jangan return, biarkan logic lain jalan jika perlu
    }

    // C. COMMAND UTILS

    // Undo Logic
    if (text === "/undo" && isAdmin(userId)) {
        await ctx.deleteMessage().catch(() => { });
        if (LAST_BROADCAST.length === 0) return ctx.reply("⚠️ Tiada broadcast terakhir.");

        const mStats = await ctx.reply(`⏳ Membatalkan ${LAST_BROADCAST.length} mesej...`);
        let successCount = 0;
        for (const item of LAST_BROADCAST) {
            try { await bot.telegram.deleteMessage(item.chat_id, item.message_id); successCount++; } catch (e) { }
        }
        LAST_BROADCAST = [];
        await bot.telegram.editMessageText(ctx.chat.id, mStats.message_id, null, `✅ Berjaya undo ${successCount} mesej.`);
        return;
    }

    // Broadcast logic
    if (ctx.chat.id === SOURCE_CHAT_ID && text === "/forward" && ctx.message.reply_to_message && isAdmin(userId)) {
        await ctx.deleteMessage().catch(() => { });
        const r = ctx.message.reply_to_message;
        const subs = await subscribersColl.find({}).toArray();
        const targets = [...subs.map(s => s.userId), ...CASH.targetGroups.filter(g => g !== SOURCE_CHAT_ID)];
        LAST_BROADCAST = []; // Reset

        for (const t of targets) {
            try {
                const s = await bot.telegram.forwardMessage(t, r.chat.id, r.message_id);
                LAST_BROADCAST.push({ chat_id: t, message_id: s.message_id });
            } catch (e) { }
        }
        return;
    }

    // D. USER LOGIC
    if (isPrivate) {
        try { await subscribersColl.updateOne({ userId }, { $set: { userId } }, { upsert: true }); } catch { }
    }
    if (!isPrivate && text === "/panel" && isAdmin(userId)) {
        if (!CASH.targetGroups.includes(ctx.chat.id)) { CASH.targetGroups.push(ctx.chat.id); await saveConfig("targetGroups", CASH.targetGroups); ctx.reply("✅ Group Berjaya Ditambah!"); }
    }

    if (isPrivate) {
        if (CASH.linkMenuData[text]) return ctx.reply("👇 Click link:", Markup.inlineKeyboard([[Markup.button.url(CASH.linkMenuData[text].label, CASH.linkMenuData[text].url)]]));
        if (CASH.menuData[text]) {
            const d = CASH.menuData[text];
            const btnLabel = d.btnLabel || "TEKAN SINI / CLICK HERE 🎁";
            const btn = Markup.inlineKeyboard([[Markup.button.url(btnLabel, d.url)]]);

            try {
                if (d.media.match(/\.(jpg|png|jpeg)/i) || !d.media.startsWith("http")) await ctx.replyWithPhoto(d.media, { caption: d.caption, ...btn });
                else await ctx.replyWithAnimation(d.media, { caption: d.caption, ...btn });
            } catch (e) {
                await ctx.reply(d.caption, { ...btn }); // Fallback text only
            }
            return;
        }
        // Feedback Forwarding
        if (!text.startsWith("/")) {
            // Forward to Log Group
            await ctx.forwardMessage(LOG_GROUP_ID).catch(() => { });
        }
    }
    if (!isPrivate) await handleModeration(ctx);
});

// ================= 5. EXPRESS SERVER & LAUNCHER =================
const app = express();
app.get("/", (req, res) => res.status(200).send("Bot Online"));

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server HTTP Running on Port: ${PORT}`);
    startServices();
});

async function startServices() {
    console.log("🔄 Starting MongoDB & Bot...");
    try {
        await connectMongo();
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        const me = await bot.telegram.getMe();
        console.log(`🤖 Bot Identity Verified: @${me.username} (${me.id})`);

        bot.launch().then(() => console.log("⚠️ Bot Stopped")).catch((err) => console.error("❌ Launch Error:", err));
        console.log("✅ Bot Telegram POLLING STARTED Successfully! (Background)");

        // Start Self-Ping
        startKeepAlive();

    } catch (error) {
        console.error("❌ Service Startup Error:", error);
    }
}

// --- KEEP ALIVE MECHANISM (PREVENT SLEEP) ---
function startKeepAlive() {
    setInterval(() => {
        http.get(`http://localhost:${PORT}`, (res) => {
            // Ping success (Silent)
        }).on('error', (err) => {
            console.error(`❌ Keep-Alive Ping Error: ${err.message}`);
        });
    }, 5 * 60 * 1000); // Ping every 5 minutes
}

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });
