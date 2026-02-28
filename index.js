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
const PORT = process.env.PORT || 8080;
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

// ================= STATE MANAGEMENT =================
const adminState = {};
const CASH = {
    bannedWords: [],
    targetGroups: [],
    admins: [],
    forwardAdmins: [], // Senarai ID yang boleh forward
    menuData: {},
    linkMenuData: {},
    startMessage: {},
    menuTitle: "👇 Sila Pilih Menu Utama:",
    // ID SISTEM (BOLEH TUKAR DI PANEL)
    SUPER_ADMIN_ID: 8146896736,
    SOURCE_CHAT_ID: -1002626291566,
    LOG_GROUP_ID: -1003832228118,
    ADMIN_LOG_GROUP_ID: -1003757875020,
    CHANNEL_ID: -1003175423118,
    CHANNEL_USERNAME: "AFB88_OFFICIAL",
    // NEW: FEATURE TOGGLES
    toggles: {
        broadcastToSubs: true,
        antiLink: true,
        antiBan: true,
        privateLog: true,
        useCaptcha: true
    },
    autoReplies: {},
    stats: { totalForwards: 0, lastStatsReset: new Date() }
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
        await load("targetGroups", [CASH.SOURCE_CHAT_ID, CASH.LOG_GROUP_ID]);
        await load("admins", [CASH.SUPER_ADMIN_ID]);

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

        // Load System IDs
        await load("SUPER_ADMIN_ID", 8146896736);
        await load("SOURCE_CHAT_ID", -1002626291566);
        await load("LOG_GROUP_ID", -1003832228118);
        await load("ADMIN_LOG_GROUP_ID", -1003757875020);
        await load("CHANNEL_ID", -1003175423118);
        await load("CHANNEL_USERNAME", "AFB88_OFFICIAL");
        await load("forwardAdmins", []);
        await load("toggles", { broadcastToSubs: true, antiLink: true, antiBan: true, privateLog: true, useCaptcha: true });
        await load("autoReplies", {});
        await load("stats", { totalForwards: 0, lastStatsReset: new Date() });

        if (!CASH.admins.includes(CASH.SUPER_ADMIN_ID)) CASH.admins.push(CASH.SUPER_ADMIN_ID);

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
const isAdmin = (id) => CASH.admins.includes(id) || id === CASH.SUPER_ADMIN_ID;
const isForwarder = (id) => CASH.forwardAdmins.includes(id) || id === CASH.SUPER_ADMIN_ID;

// --- 0. GLOBAL MIDDLEWARE & DEBUGGER ---
bot.use(async (ctx, next) => {
    try {
        if (ctx.updateType === 'message' && ctx.from) {
            const user = ctx.from.username || ctx.from.first_name || "Unknown";
            console.log(`📩 INCOMING MSG [${user}]: ${ctx.message.text || ctx.message.caption || "Media"}`);
        }
    } catch (e) {
        console.error("📩 Middleware Log Error:", e.message);
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

        // --- Fitur 2: CAPTCHA VERIFICATION ---
        if (CASH.toggles.useCaptcha) {
            try {
                // Mute member dulu (RESTRICT)
                await ctx.restrictChatMember(member.id, {
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false
                });

                const captchaText = `👋 **SELAMAT DATANG** ${name}!\n\nSila tekan butang di bawah untuk sahkan anda bukan robot sebelum boleh berbual.`;
                const captchaKbd = Markup.inlineKeyboard([
                    [Markup.button.callback("✅ SAYA BUKAN ROBOT", `verify_user_${member.id}`)]
                ]);

                const m = await ctx.reply(captchaText, { parse_mode: "Markdown", ...captchaKbd });
                // Hapus mesej captcha selepas 2 minit jika tidak dilayan
                setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 120000);
            } catch (e) { console.error("Captcha Mute Error:", e.message); }
            continue; // Skip welcome biasa jika guna captcha
        }

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

// Handler Verifikasi Captcha
bot.action(/^verify_user_(\d+)$/, async (ctx) => {
    const targetUserId = parseInt(ctx.match[1]);
    if (ctx.from.id !== targetUserId) return ctx.answerCbQuery("❌ Butang ini bukan untuk anda!", { show_alert: true });

    try {
        await ctx.restrictChatMember(targetUserId, {
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true
        });
        await ctx.answerCbQuery("✅ Verifikasi Berjaya! Anda boleh berbual sekarang.");
        await ctx.deleteMessage().catch(() => { });

        // Kirim Welcome pendek & padam cepat (5 saat)
        const name = ctx.from.first_name;
        const m = await ctx.reply(`🎉 **Verifikasi Berjaya!**\nSelamat datang ${name}.`);
        setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 5000);
    } catch (e) {
        ctx.answerCbQuery("❌ Bot memerlukan kuasa Admin untuk verifikasi.", { show_alert: true });
    }
});

// =================== START COMMAND ===================
bot.start(async (ctx) => {
    // SEKAT /start DI DALAM GROUP (Hanya benarkan di Private Chat)
    if (ctx.chat.type !== "private") {
        return ctx.deleteMessage().catch(() => { });
    }

    console.log("⚡ PROCESSING /START...");
    if (!ctx.from) return; // Safety exit

    try {
        if (subscribersColl) {
            const userCount = await subscribersColl.countDocuments({ userId: ctx.from.id });
            if (userCount === 0) {
                await subscribersColl.updateOne({ userId: ctx.from.id }, { $set: { userId: ctx.from.id, name: ctx.from.first_name } }, { upsert: true });

                // Notif New Subscriber ke Admin Log Group
                const notifText = `🎉 **NEW SUBSCRIBER**\nName: ${ctx.from.first_name}\nID: \`${ctx.from.id}\``;
                await bot.telegram.sendMessage(CASH.ADMIN_LOG_GROUP_ID, notifText, { parse_mode: "Markdown" }).catch(() => { });
            }
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
            [Markup.button.callback("⚙️ Tetapan ID Sistem", "manage_system_ids"), Markup.button.callback("🛠 Kawalan Fitur (ON/OFF)", "manage_features")],
            [Markup.button.callback("🚀 Refresh & Deploy", "refresh_bot")],
            [Markup.button.callback("❌ Tutup Panel", "close_panel")]
        ])
    });
});
bot.action("close_panel", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    ctx.deleteMessage().catch(() => { });
});
bot.action("back_home", async (ctx) => {
    await ctx.answerCbQuery();
    const txt = `🎛 **PANEL ADMIN BOT V2**\n\nSila pilih menu tetapan di bawah:`;
    await ctx.editMessageText(txt, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔘 Menu Utama (Butang)", "manage_menu"), Markup.button.callback("🔗 Link (Inline)", "manage_link")],
            [Markup.button.callback("🏁 Mesej Start & Title", "manage_start"), Markup.button.callback("📢 Sistem Broadcast", "manage_broadcast")],
            [Markup.button.callback("👮 Urus Admin & Group", "manage_admin"), Markup.button.callback("🛡 Senarai Kata Terlarang", "manage_ban")],
            [Markup.button.callback("⚙️ Tetapan ID Sistem", "manage_system_ids"), Markup.button.callback("🛠 Kawalan Fitur (ON/OFF)", "manage_features")],
            [Markup.button.callback("🚀 Refresh & Deploy", "refresh_bot")],
            [Markup.button.callback("❌ Tutup Panel", "close_panel")]
        ])
    });
});

bot.action("manage_system_ids", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });

    const txt = `⚙️ <b>TETAPAN ID SISTEM</b>\n\n` +
        `👤 <b>Super Admin:</b> <code>${CASH.SUPER_ADMIN_ID}</code> [SUPER_ADMIN_ID]\n` +
        `📍 <b>Source Group:</b> <code>${CASH.SOURCE_CHAT_ID}</code> [SOURCE_CHAT_ID]\n` +
        `📺 <b>Channel ID:</b> <code>${CASH.CHANNEL_ID}</code> [CHANNEL_ID]\n` +
        `📝 <b>Log Group:</b> <code>${CASH.LOG_GROUP_ID}</code> [LOG_GROUP_ID]\n` +
        `🔔 <b>Admin Log:</b> <code>${CASH.ADMIN_LOG_GROUP_ID}</code> [ADMIN_LOG_GROUP_ID]\n` +
        `📢 <b>Username:</b> @${CASH.CHANNEL_USERNAME} [CHANNEL_USERNAME]\n\n` +
        `<i>Sila pilih ID yang ingin ditukar:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("👑 Super Admin", "edit_id_SUPER_ADMIN_ID")],
            [Markup.button.callback("📍 Source Group", "edit_id_SOURCE_CHAT_ID"), Markup.button.callback("📺 Channel ID", "edit_id_CHANNEL_ID")],
            [Markup.button.callback("📝 Log Group", "edit_id_LOG_GROUP_ID"), Markup.button.callback("🔔 Admin Log", "edit_id_ADMIN_LOG_GROUP_ID")],
            [Markup.button.callback("👤 Username Channel", "edit_id_CHANNEL_USERNAME")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    }).catch(e => console.error("Error Edit System IDs:", e.message));
});

// --- NEW FEATURE CONTROL MENU ---
bot.action("manage_features", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const { broadcastToSubs, antiLink, antiBan, privateLog, useCaptcha } = CASH.toggles;

    const txt = `🛠 <b>KAWALAN FITUR BOT</b>\n\n` +
        `📢 <b>Broadcast ke User:</b> ${broadcastToSubs ? '✅ ON' : '❌ OFF'}\n` +
        `🔗 <b>Anti-Link System:</b> ${antiLink ? '✅ ON' : '❌ OFF'}\n` +
        `🛡 <b>Anti-Banned Words:</b> ${antiBan ? '✅ ON' : '❌ OFF'}\n` +
        `🔐 <b>Captcha Verifikasi:</b> ${useCaptcha ? '✅ ON' : '❌ OFF'}\n` +
        `📝 <b>Log Chat Peribadi:</b> ${privateLog ? '✅ ON' : '❌ OFF'}\n\n` +
        `<i>Tekan butang di bawah untuk tukar status:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback(`${broadcastToSubs ? '❌ OFF' : '✅ ON'} Broadcast User`, "toggle_feat_broadcastToSubs")],
            [Markup.button.callback(`${antiLink ? '❌ OFF' : '✅ ON'} Anti-Link`, "toggle_feat_antiLink"), Markup.button.callback(`${antiBan ? '❌ OFF' : '✅ ON'} Anti-Ban`, "toggle_feat_antiBan")],
            [Markup.button.callback(`${useCaptcha ? '❌ OFF' : '✅ ON'} Captcha System`, "toggle_feat_useCaptcha")],
            [Markup.button.callback(`${privateLog ? '❌ OFF' : '✅ ON'} Log Chat`, "toggle_feat_privateLog")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    });
});

bot.action(/^toggle_feat_(.+)$/, async (ctx) => {
    const feat = ctx.match[1];
    CASH.toggles[feat] = !CASH.toggles[feat];
    await saveConfig("toggles", CASH.toggles);
    await ctx.answerCbQuery(`✅ Status ${feat} ditukar!`);

    const { broadcastToSubs, antiLink, antiBan, privateLog, useCaptcha } = CASH.toggles;
    const txt = `🛠 <b>KAWALAN FITUR BOT</b>\n\n` +
        `📢 <b>Broadcast ke User:</b> ${broadcastToSubs ? '✅ ON' : '❌ OFF'}\n` +
        `🔗 <b>Anti-Link System:</b> ${antiLink ? '✅ ON' : '❌ OFF'}\n` +
        `🛡 <b>Anti-Banned Words:</b> ${antiBan ? '✅ ON' : '❌ OFF'}\n` +
        `🔐 <b>Captcha Verifikasi:</b> ${useCaptcha ? '✅ ON' : '❌ OFF'}\n` +
        `📝 <b>Log Chat Peribadi:</b> ${privateLog ? '✅ ON' : '❌ OFF'}\n\n` +
        `<i>Tekan butang di bawah untuk tukar status:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback(`${broadcastToSubs ? '❌ OFF' : '✅ ON'} Broadcast User`, "toggle_feat_broadcastToSubs")],
            [Markup.button.callback(`${antiLink ? '❌ OFF' : '✅ ON'} Anti-Link`, "toggle_feat_antiLink"), Markup.button.callback(`${antiBan ? '❌ OFF' : '✅ ON'} Anti-Ban`, "toggle_feat_antiBan")],
            [Markup.button.callback(`${useCaptcha ? '❌ OFF' : '✅ ON'} Captcha System`, "toggle_feat_useCaptcha")],
            [Markup.button.callback(`${privateLog ? '❌ OFF' : '✅ ON'} Log Chat`, "toggle_feat_privateLog")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    });
});

bot.action(/^edit_id_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const key = ctx.match[1];
    adminState[ctx.from.id] = { action: "WAIT_SYSTEM_ID", key: key };
    ctx.reply(`✍️ Sila taip nilai/ID baru untuk **${key}**:`);
});

bot.action("refresh_bot", async (ctx) => {
    await ctx.answerCbQuery("🚀 Memulakan semula bot...");
    await ctx.editMessageText("🔄 **BOT SEDANG DI-REFRESH...**\n\nSila tunggu lebih kurang 10-30 saat untuk proses deploy semula. Panel ini akan ditutup.");
    setTimeout(() => {
        ctx.deleteMessage().catch(() => { });
        process.exit(0);
    }, 2000);
});

// --- NEW FUNCTION: AUTO-REPLY MANAGER ---
bot.action("manage_auto_reply", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const keys = Object.keys(CASH.autoReplies);
    const list = keys.map((k, i) => `${i + 1}. <b>${k}</b> ➔ ${CASH.autoReplies[k].substring(0, 20)}...`).join("\n");

    const txt = `🤖 <b>URUS AUTO-REPLY (KEYWORD)</b>\n\n${list || "<i>(Tiada Data)</i>"}\n\n` +
        `📌 <b>Info:</b> Bot akan balas keyword ini jika dijumpai dalam chat.`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Keyword", "add_reply_kw"), Markup.button.callback("🗑 Padam Keyword", "del_reply_kw")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    });
});

bot.action("add_reply_kw", async (ctx) => {
    adminState[ctx.from.id] = { action: "WAIT_REPLY_KW" };
    ctx.reply("✍️ Taip <b>Keyword</b> yang ingin dikesan (Satu perkataan/ayat pendek):", { parse_mode: "HTML" });
});

bot.action("del_reply_kw", async (ctx) => {
    const keys = Object.keys(CASH.autoReplies);
    if (keys.length === 0) return ctx.answerCbQuery("⚠️ Senarai kosong.", { show_alert: true });
    const buttons = keys.map(k => [Markup.button.callback(`🗑 ${k}`, `rm_reply_kw_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_auto_reply")]);
    ctx.editMessageText("Pilih keyword untuk dibuang:", Markup.inlineKeyboard(buttons));
});

bot.action(/^rm_reply_kw_(.+)$/, async (ctx) => {
    const kw = ctx.match[1];
    delete CASH.autoReplies[kw];
    await saveConfig("autoReplies", CASH.autoReplies);
    await ctx.answerCbQuery("✅ Keyword dibuang!");
    ctx.triggerAction("manage_auto_reply");
});

// --- NEW FUNCTION: STATS & EXPORT ---
bot.action("manage_stats", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const subCount = subscribersColl ? await subscribersColl.countDocuments({}) : 0;

    const txt = `📊 <b>STATISTIK & LAPORAN BOT</b>\n\n` +
        `👥 <b>Jumlah Subscriptions:</b> ${subCount} user\n` +
        `🚀 <b>Total Forward Berjaya:</b> ${CASH.stats.totalForwards} kali\n` +
        `🏢 <b>Target Group:</b> ${CASH.targetGroups.length} group\n` +
        `🗓 <b>Laporan Sejak:</b> ${new Date(CASH.stats.lastStatsReset).toLocaleDateString()}\n\n` +
        `<i>Anda boleh download data semua subs di bawah:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("📥 Export User Data (.txt)", "export_subs")],
            [Markup.button.callback("🔄 Reset Stats", "reset_stats")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    });
});

bot.action("reset_stats", async (ctx) => {
    CASH.stats = { totalForwards: 0, lastStatsReset: new Date() };
    await saveConfig("stats", CASH.stats);
    ctx.answerCbQuery("✅ Statistik telah di-reset!");
    ctx.triggerAction("manage_stats");
});

bot.action("export_subs", async (ctx) => {
    await ctx.answerCbQuery("⏳ Menjana fail data...").catch(() => { });
    try {
        const subs = await subscribersColl.find({}).toArray();
        if (subs.length === 0) return ctx.reply("⚠️ Tiada data user untuk di-export.");

        let content = `SENARAI SUBSCRIBER BOT - ${new Date().toLocaleString()}\n`;
        content += `==========================================\n\n`;
        subs.forEach((s, i) => {
            content += `${i + 1}. ID: ${s.userId} | Name: ${s.name || 'N/A'}\n`;
        });

        const buffer = Buffer.from(content, 'utf-8');
        await ctx.replyWithDocument({ source: buffer, filename: `subscribers_${Date.now()}.txt` }, {
            caption: `📊 **EXPORT BERJAYA**\nJumlah: ${subs.length} user.`
        });
    } catch (e) {
        ctx.reply("❌ Gagal export data: " + e.message);
    }
});

// --- 2. MENU MANAGERS ---
bot.action("manage_menu", async (ctx) => {
    await ctx.answerCbQuery();
    const list = Object.keys(CASH.menuData).map((k, i) => `${i + 1}. ${k}`).join("\n");
    await ctx.editMessageText(`🔘 **MENU UTAMA/KEYBOARD**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Butang", "add_menu_start"), Markup.button.callback("🗑 Padam Butang", "del_menu_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
// Add/Del Menu Logic
bot.action("add_menu_start", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); adminState[ctx.from.id] = { action: "WAIT_MENU_NAME", data: {} }; ctx.editMessageText("1️⃣ **LANGKAH 1/5**\nSila taip **NAMA BUTANG**:", { parse_mode: "Markdown" }); });
bot.action("del_menu_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const buttons = Object.keys(CASH.menuData).map(k => [Markup.button.callback(`🗑 ${k}`, `do_rm_menu_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_menu")]);
    await ctx.editMessageText("Sila pilih butang untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^do_rm_menu_(.+)$/, async (ctx) => {
    delete CASH.menuData[ctx.match[1]]; await saveConfig("menuData", CASH.menuData);
    await ctx.answerCbQuery("✅ Berjaya dipadam!");
    const list = Object.keys(CASH.menuData).map((k, i) => `${i + 1}. ${k}`).join("\n");
    return ctx.editMessageText(`🔘 **MENU UTAMA/KEYBOARD**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Butang", "add_menu_start"), Markup.button.callback("🗑 Padam Butang", "del_menu_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});

// Link Logic
// Link/Header Menu Logic
bot.action("manage_link", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const list = Object.keys(CASH.linkMenuData).map((k, i) => `${i + 1}. ${CASH.linkMenuData[k].label}`).join("\n");
    await ctx.editMessageText(`🔗 **MENU LINK (HEADER)**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Menu", "add_link_start"), Markup.button.callback("🗑 Padam Menu", "del_link_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});

bot.action("add_link_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_LINK_KEY", data: {} };
    ctx.editMessageText("1️⃣ **LANGKAH 1/4**\nSila taip **ID UNIK** (Cth: promo1, link2):", { parse_mode: "Markdown" });
});

bot.action("del_link_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const buttons = Object.keys(CASH.linkMenuData).map(k => [Markup.button.callback(`🗑 ${CASH.linkMenuData[k].label}`, `do_rm_link_${k}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_link")]);
    await ctx.editMessageText("Sila pilih menu untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^do_rm_link_(.+)$/, async (ctx) => {
    delete CASH.linkMenuData[ctx.match[1]]; await saveConfig("linkMenuData", CASH.linkMenuData);
    await ctx.answerCbQuery("✅ Berjaya dipadam!");
    const list = Object.keys(CASH.linkMenuData).map((k, i) => `${i + 1}. ${CASH.linkMenuData[k].label}`).join("\n");
    return ctx.editMessageText(`🔗 **MENU LINK (HEADER)**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Menu", "add_link_start"), Markup.button.callback("🗑 Padam Menu", "del_link_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
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
bot.action("manage_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
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
    const updatedLines = (CASH.menuTitle || "").split("\n").filter(x => x.trim());
    const displayList = updatedLines.map((l, i) => `${i + 1}. ${l}`).join("\n");
    return ctx.editMessageText(
        `🔤 **URUS MENU TITLE (TEXT)**\n\n${displayList || "(Tiada Text)"}`,
        Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Baris", "add_title_line"), Markup.button.callback("🗑 Padam Baris", "del_title_line")],
            [Markup.button.callback("🔙 Kembali", "manage_start")]
        ])
    );
});
// ------------------------------

bot.action("manage_broadcast", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    ctx.editMessageText(`📢 **SISTEM BROADCAST**\n1️⃣ Hantar promo ke **Group Asal (Source)**\n2️⃣ **Reply** mesej tersebut\n3️⃣ Taip command: \`/forward\`\n\n(❗️ Taip \`/undo\` jika tersalah hantar)`, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "back_home")]]) });
});

// Admin & Ban Logic
bot.action("manage_admin", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    await ctx.editMessageText(`👮 **URUS ADMIN & GROUP**\n👤 Jumlah Admin: ${CASH.admins.length}\n📢 Forwarder Sah: ${CASH.forwardAdmins.length}\n👥 Jumlah Group: ${CASH.targetGroups.length}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Admin", "do_add_admin"), Markup.button.callback("➖ Buang Admin", "do_del_admin")],
        [Markup.button.callback("➕ Tambah Forwarder", "do_add_fwd_admin"), Markup.button.callback("➖ Buang Forwarder", "do_del_fwd_admin")],
        [Markup.button.callback("➕ Tambah Group", "do_add_group"), Markup.button.callback("➖ Buang Group", "do_del_group")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});
bot.action("do_add_admin", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); adminState[ctx.from.id] = { action: "WAIT_ADD_ADMIN" }; ctx.reply("Sila taip ID User:"); });
bot.action("do_del_admin", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    if (CASH.admins.length === 0) return ctx.answerCbQuery("⚠️ Tiada admin.", { show_alert: true });
    const buttons = CASH.admins.map(id => [Markup.button.callback(`🗑 ${id}`, `rm_admin_val_${id}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Admin untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_admin_val_(.+)$/, async (ctx) => {
    const id = parseInt(ctx.match[1]);
    if (id === CASH.SUPER_ADMIN_ID) return ctx.answerCbQuery("❌ Super Admin tidak boleh dipadam!", { show_alert: true });
    CASH.admins = CASH.admins.filter(a => a !== id);
    await saveConfig("admins", CASH.admins);
    await ctx.answerCbQuery("✅ Admin dipadam!");
    ctx.editMessageText("Admin berjaya dipadam. Klik Kembali atau Refresh.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "manage_admin")]]));
});

bot.action("do_add_fwd_admin", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); adminState[ctx.from.id] = { action: "WAIT_ADD_FWD" }; ctx.reply("Sila taip ID User (Forwarder):"); });
bot.action("do_del_fwd_admin", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    if (CASH.forwardAdmins.length === 0) return ctx.answerCbQuery("⚠️ Tiada forwarder.", { show_alert: true });
    const buttons = CASH.forwardAdmins.map(id => [Markup.button.callback(`🗑 ${id}`, `rm_fwd_val_${id}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Forwarder untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_fwd_val_(.+)$/, async (ctx) => {
    const id = parseInt(ctx.match[1]);
    CASH.forwardAdmins = CASH.forwardAdmins.filter(a => a !== id);
    await saveConfig("forwardAdmins", CASH.forwardAdmins);
    await ctx.answerCbQuery("✅ Forwarder dipadam!");
    ctx.editMessageText("Forwarder berjaya dipadam.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "manage_admin")]]));
});

bot.action("do_add_group", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); ctx.reply("Sila taip ID Group:"); adminState[ctx.from.id] = { action: "WAIT_ADD_GROUP" }; });
bot.action("do_del_group", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    if (CASH.targetGroups.length === 0) return ctx.answerCbQuery("⚠️ Tiada group.", { show_alert: true });
    const buttons = CASH.targetGroups.map(id => [Markup.button.callback(`🗑 ${id}`, `rm_group_val_${id}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Group untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_group_val_(.+)$/, async (ctx) => {
    const id = parseInt(ctx.match[1]);
    CASH.targetGroups = CASH.targetGroups.filter(g => g !== id);
    await saveConfig("targetGroups", CASH.targetGroups);
    await ctx.answerCbQuery("✅ Group dipadam!");
    ctx.editMessageText("Group berjaya dipadam.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "manage_admin")]]));
});

bot.action("manage_ban", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const list = CASH.bannedWords.map((w, i) => `<b>${i + 1}.</b> <code>${String(w).replace(/</g, '&lt;')}</code>`).join("\n");
    await ctx.editMessageText(`🛡 <b>SENARAI KATA TERLARANG</b>\n\n${list || "<i>(Tiada Data)</i>"}`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Kata", "do_add_ban"), Markup.button.callback("➖ Buang Kata", "do_del_ban")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    }).catch(e => console.error("Error Manage Ban:", e.message));
});

bot.action("do_add_ban", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_ADD_BAN" };
    ctx.reply("✍️ **TAMBAH KATA TERLARANG**\n\nSila taip kata terlarang baru.\n(Anda boleh taip banyak baris untuk tambah banyak kata sekaligus)", { parse_mode: "Markdown" });
});

bot.action("do_del_ban", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    if (!CASH.bannedWords || CASH.bannedWords.length === 0) return ctx.answerCbQuery("⚠️ Senarai masih kosong.", { show_alert: true });

    // Pecahkan butang kepada 2 kolum, limit 20 huruf sahaja pada label
    const buttons = CASH.bannedWords.map((w, i) => {
        const label = String(w).replace(/\n/g, ' ').substring(0, 15);
        return Markup.button.callback(`🗑 ${label}${w.length > 15 ? '..' : ''}`, `rm_ban_idx_${i}`);
    });

    const keyboard = [];
    while (buttons.length) keyboard.push(buttons.splice(0, 2));
    keyboard.push([Markup.button.callback("🔙 Batal", "manage_ban")]);

    await ctx.editMessageText("Sila klik pada kata yang ingin dipadam:", Markup.inlineKeyboard(keyboard)).catch(() => {
        ctx.reply("❌ Senarai terlalu panjang untuk dipaparkan dalam satu menu. Sila padam secara berperingkat.");
    });
});

bot.action(/^rm_ban_idx_(\d+)$/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    if (CASH.bannedWords[idx] !== undefined) {
        const removed = CASH.bannedWords.splice(idx, 1);
        await saveConfig("bannedWords", CASH.bannedWords);
        await ctx.answerCbQuery(`✅ Dipadam: ${removed}`);
    }
    // Refresh list
    const list = CASH.bannedWords.map((w, i) => `<b>${i + 1}.</b> <code>${String(w).replace(/</g, '&lt;')}</code>`).join("\n");
    await ctx.editMessageText(`🛡 <b>SENARAI KATA TERLARANG</b>\n\n${list || "<i>(Tiada Data)</i>"}`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Kata", "do_add_ban"), Markup.button.callback("➖ Buang Kata", "do_del_ban")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    }).catch(() => { });
});

// --- 3. MODERATION ---
async function handleModeration(ctx) {
    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) return;

    // HANYA Moderate jika group ada dalam senarai Target atau Source
    const isTargetGroup = CASH.targetGroups.includes(ctx.chat.id);
    const isSourceGroup = ctx.chat.id === CASH.SOURCE_CHAT_ID;
    if (!isTargetGroup && !isSourceGroup) return;

    // Kecualikan Admin, Bot, dan Anonymous Admin (identiti Group)
    if (!ctx.from || ctx.from.is_bot || isAdmin(ctx.from.id) || ctx.from.id === 1087968824) return;

    const msg = ctx.message;
    if (msg.forward_from_chat && [CASH.CHANNEL_ID, CASH.SOURCE_CHAT_ID].includes(msg.forward_from_chat.id)) return;
    const text = (msg.text || msg.caption || "").toString().toLowerCase();

    if (CASH.toggles.antiBan && CASH.bannedWords.some(w => text.includes(w))) {
        await ctx.deleteMessage().catch(() => { });
        return await warnUser(ctx, "Penggunaan Kata Terlarang");
    }
    const hasLink = (msg.entities || msg.caption_entities || []).some(e => e.type === "url" || e.type === "text_link") || /https?:\/\/|t\.me\//i.test(text);
    if (CASH.toggles.antiLink && hasLink) {
        await ctx.deleteMessage().catch(() => { });
        return await warnUser(ctx, "Link Tidak Dibenarkan");
    }

    // --- AUTO-REPLY CHECK (With Auto-Delete to keep group clean) ---
    for (const kw in CASH.autoReplies) {
        if (text.includes(kw.toLowerCase())) {
            try {
                const m = await ctx.reply(CASH.autoReplies[kw]);
                // Padam jawapan bot selepas 30 saat
                setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 30000);
            } catch (e) { }
            break;
        }
    }
}
async function warnUser(ctx, reason) {
    const m = await ctx.reply(`⚠️ **AMARAN!**\nNama: ${ctx.from.first_name}\nSebab: ${reason}`);
    setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 5000);
}

// --- 4. COMMAND HANDLERS ---
bot.command("id", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    return ctx.reply(`🆔 **ID INFO**\n\nChat ID: <code>${ctx.chat.id}</code>\nUser ID: <code>${ctx.from.id}</code>`, { parse_mode: "HTML" });
});

bot.command("undo", async (ctx) => {
    const userId = ctx.from.id;
    if (!isAdmin(userId)) return;

    await ctx.deleteMessage().catch(() => { });
    if (LAST_BROADCAST.length === 0) return ctx.reply("⚠️ Tiada broadcast terakhir untuk di-undo.");

    const mStats = await ctx.reply(`⏳ Membatalkan ${LAST_BROADCAST.length} mesej...`);
    let successCount = 0;
    for (const item of LAST_BROADCAST) {
        try { await bot.telegram.deleteMessage(item.chat_id, item.message_id); successCount++; } catch (e) { }
    }
    LAST_BROADCAST = [];
    await bot.telegram.editMessageText(ctx.chat.id, mStats.message_id, null, `✅ Berjaya undo ${successCount} mesej.`);
});

bot.command("forward", async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || "Unknown";

    // Auto-Delete command message to keep group clean
    await ctx.deleteMessage().catch(() => { });

    // 0. Debug Log
    await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `🔍 **DEBUG**: /forward dipanggil oleh ${userName} (\`${userId}\`) di Chat: \`${ctx.chat.id}\``, { parse_mode: "Markdown" }).catch(() => { });

    // 1. Semak kebenaran
    if (!isForwarder(userId)) {
        const logText = `❌ **FAILED FORWARD**\nUser: ${userName} (\`${userId}\`)\nReason: Tiada akses Forwarder.`;
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, logText, { parse_mode: "Markdown" }).catch(() => { });
    }

    // 2. Semak jika ini adalah reply
    if (!ctx.message.reply_to_message) {
        const logText = `⚠️ **FAILED FORWARD**\nUser: ${userName} (\`${userId}\`)\nReason: Tidak reply pada mesej.`;
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, logText, { parse_mode: "Markdown" }).catch(() => { });
    }

    const r = ctx.message.reply_to_message;

    // Ambil semua subscriber + target groups
    let subs = [];
    if (CASH.toggles.broadcastToSubs) {
        try {
            if (subscribersColl) subs = await subscribersColl.find({}).toArray();
        } catch (e) { console.error("DB Fetch Error:", e); }
    }

    let targets = [...subs.map(s => s.userId), ...CASH.targetGroups];

    // Buang ID group asal supaya tidak forward ke group sendiri dan buang duplicate
    const uniqueTargets = [...new Set(targets)].filter(id => id && id !== ctx.chat.id);

    // LOG Sasarang yang dijumpai
    await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `🎯 **SASARAN DIJUMPAI**: ${uniqueTargets.length} destinasi.\n(Group: ${CASH.targetGroups.length}, Subs: ${CASH.toggles.broadcastToSubs ? subs.length : 'OFF'})`).catch(() => { });

    if (uniqueTargets.length === 0) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **FAILED FORWARD**\nReason: Tiada sasaran (sasaran 0). Sila pastikan anda telah menambah Group Target atau Channel ID.`).catch(() => { });
    }

    LAST_BROADCAST = []; // Reset
    let count = 0;
    let failMessages = [];

    for (const t of uniqueTargets) {
        try {
            LAST_BROADCAST.push({ chat_id: t, message_id: s.message_id });
            count++;
        } catch (e) {
            failMessages.push(`❌ \`${t}\`: ${e.message}`);
        }
    }

    if (count > 0) {
        CASH.stats.totalForwards += count;
        await saveConfig("stats", CASH.stats);
    }

    if (count === 0) {
        let errLog = `⚠️ **FORWARD COMPLETED (0)**\nMesej tidak berjaya ke mana-mana sasaran.\n\n**Ralat Terperinci:**\n${failMessages.slice(0, 5).join('\n')}`;
        await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, errLog, { parse_mode: "Markdown" }).catch(() => { });
    } else {
        let stats = `🚀 **BROADCAST SUCCESS**\nBy: ${userName} (\`${userId}\`)\nBerjaya: ${count}\nGagal: ${uniqueTargets.length - count}`;
        if (failMessages.length > 0) stats += `\n\n**Gagal di:**\n${failMessages.slice(0, 3).join('\n')}`;
        await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, stats, { parse_mode: "Markdown" }).catch(() => { });
    }
});

// --- 5. MESSAGE HANDLER ---
bot.on("message", async (ctx, next) => {
    const textSnapshot = (ctx.message.text || "").trim();
    // Skip if it is a command
    if (textSnapshot.startsWith("/")) return next();

    const userId = ctx.from.id;
    const isPrivate = ctx.chat.type === "private";
    const text = textSnapshot; // Re-use the existing snapshot

    // A. ADMIN WIZARD
    if (isAdmin(userId) && adminState[userId]) {
        const state = adminState[userId];
        if (text && ["batal", "/cancel"].includes(text.toLowerCase())) { delete adminState[userId]; return ctx.reply("🚫 Tindakan dibatalkan.", Markup.removeKeyboard()); }

        // Admin Logic
        if (state.action === "WAIT_ADD_ADMIN") {
            const id = parseInt(text);
            if (isNaN(id)) { await ctx.reply("❌ ID tidak sah. Sila masukkan nombor sahaja."); }
            else if (CASH.admins.includes(id)) { await ctx.reply("⚠️ User ini sudah menjadi admin."); }
            else { CASH.admins.push(id); await saveConfig("admins", CASH.admins); await ctx.reply("✅ Admin berjaya ditambah."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_ADMIN") {
            const id = parseInt(text);
            if (id === CASH.SUPER_ADMIN_ID) { await ctx.reply("❌ Super Admin tidak boleh dibuang."); }
            else if (!CASH.admins.includes(id)) { await ctx.reply("⚠️ User ini bukan admin."); }
            else { CASH.admins = CASH.admins.filter(a => a !== id); await saveConfig("admins", CASH.admins); await ctx.reply("✅ Admin berjaya dibuang."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_FWD") {
            const id = parseInt(text);
            if (isNaN(id)) { await ctx.reply("❌ ID tidak sah."); }
            else if (CASH.forwardAdmins.includes(id)) { await ctx.reply("⚠️ User ini sudah menjadi forwarder."); }
            else { CASH.forwardAdmins.push(id); await saveConfig("forwardAdmins", CASH.forwardAdmins); await ctx.reply("✅ Forwarder berjaya ditambah."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_FWD") {
            const id = parseInt(text);
            if (!CASH.forwardAdmins.includes(id)) { await ctx.reply("⚠️ User ini bukan forwarder."); }
            else { CASH.forwardAdmins = CASH.forwardAdmins.filter(a => a !== id); await saveConfig("forwardAdmins", CASH.forwardAdmins); await ctx.reply("✅ Forwarder berjaya dibuang."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_GROUP") {
            const id = parseInt(text);
            if (isNaN(id)) { await ctx.reply("❌ ID Group tidak sah. Sila masukkan nombor (Cth: -100xxx)."); }
            else if (CASH.targetGroups.includes(id)) { await ctx.reply("⚠️ Group ini sudah ada dalam senarai."); }
            else { CASH.targetGroups.push(id); await saveConfig("targetGroups", CASH.targetGroups); await ctx.reply("✅ Group berjaya ditambah."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_DEL_GROUP") {
            const id = parseInt(text);
            if (isNaN(id)) { await ctx.reply("❌ ID Group tidak sah."); }
            else if (!CASH.targetGroups.includes(id)) { await ctx.reply("⚠️ Group ini tiada dalam senarai."); }
            else { CASH.targetGroups = CASH.targetGroups.filter(g => g !== id); await saveConfig("targetGroups", CASH.targetGroups); await ctx.reply("✅ Group berjaya dibuang."); }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_BAN") {
            // Support multiple lines adding
            const words = text.split("\n").map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
            let addedCount = 0;

            for (const w of words) {
                if (!CASH.bannedWords.includes(w)) {
                    CASH.bannedWords.push(w);
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                await saveConfig("bannedWords", CASH.bannedWords);
                await ctx.reply(`✅ Berjaya menambah <b>${addedCount}</b> kata terlarang baru!`, { parse_mode: "HTML" });
            } else {
                await ctx.reply("⚠️ Tiada kata baru ditambah (mungkin sudah ada dalam senarai).");
            }
            delete adminState[userId]; return;
        }

        if (state.action === "WAIT_REPLY_KW") {
            state.data = { kw: text };
            adminState[userId].action = "WAIT_REPLY_VAL";
            return ctx.reply(`2️⃣ Sila taip <b>Jawapan Automas</b> untuk keyword "${text}":`, { parse_mode: "HTML" });
        }
        if (state.action === "WAIT_REPLY_VAL") {
            CASH.autoReplies[state.data.kw] = text;
            await saveConfig("autoReplies", CASH.autoReplies);
            delete adminState[userId];
            return ctx.reply(`✅ Auto-Reply disimpan!\n\nKeyword: ${state.data.kw}\nJawapan: ${text}`);
        }

        if (state.action === "WAIT_DEL_BAN") {
            const w = text.toLowerCase();
            if (!CASH.bannedWords.includes(w)) { await ctx.reply("⚠️ Kata ini tiada dalam senarai."); }
            else { CASH.bannedWords = CASH.bannedWords.filter(x => x !== w); await saveConfig("bannedWords", CASH.bannedWords); await ctx.reply("✅ Kata berjaya dibuang."); }
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
        if (state.action === "WAIT_LINK_KEY") { const title = text.replace(/\s+/g, '_'); state.data.trigger = title; state.action = "WAIT_LINK_LABEL"; return ctx.reply(`🆔 ID: ${title}\n\n2️⃣ Sila taip **LABEL** (Nama pada butang):`); }
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

        if (state.action === "WAIT_SYSTEM_ID") {
            let val = text.trim();
            if (state.key.includes("_ID")) {
                val = parseInt(val);
                if (isNaN(val)) return ctx.reply("❌ <b>ID TIDAK SAH!</b>\nSila masukkan nombor sahaja (Cth: -1001234567).", { parse_mode: "HTML" });
            }

            CASH[state.key] = val;
            await saveConfig(state.key, val);
            delete adminState[userId];
            return ctx.reply(`✅ <b>${state.key}</b> berjaya dikemaskini kepada:\n<code>${val}</code>`, { parse_mode: "HTML" });
        }
    }

    // B. REPLY SYSTEM (ADMIN -> USER)
    // Jika admin reply pesan forward di LOG_GROUP_ID, kirim balik ke user
    if ((ctx.chat.id === CASH.LOG_GROUP_ID || ctx.chat.id === CASH.SOURCE_CHAT_ID) && ctx.message.reply_to_message && isAdmin(userId)) {
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

    // C. USER LOGIC
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
                await ctx.reply(d.caption, { ...btn });
            }
            return;
        }
        // Feedback Forwarding
        if (CASH.toggles.privateLog && !text.startsWith("/")) {
            await ctx.forwardMessage(CASH.LOG_GROUP_ID).catch(() => { });
        }
        await ctx.reply("BACK TO MENU TEKAN /start").catch(() => { });
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
    console.log("🔄 [STARTUP] Memulakan perkhidmatan...");

    // 1. Cuba Online Bot SEGERA
    try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        const me = await bot.telegram.getMe();
        console.log(`🤖 [BOT] Berjaya Online: @${me.username}`);

        bot.launch()
            .then(() => console.log("⚠️ [BOT] Polling Berhenti"))
            .catch((err) => console.error("❌ [BOT] Gagal Launch:", err.message));

        console.log("✅ [BOT] Polling bermula di latar belakang.");
    } catch (err) {
        console.error("❌ [BOT] Gagal Startup (Sila check BOT_TOKEN):", err.message);
    }

    // 2. Hubung MongoDB di Latar Belakang
    console.log("🔄 [DB] Menghubungi MongoDB...");
    connectMongo().then(() => {
        console.log("✅ [DB] MongoDB Berjaya Disambungkan.");
    }).catch(err => {
        console.error("⚠️ [DB] MongoDB Gagal disambung (Bot mungkin lambat respon):", err.message);
    });

    startKeepAlive();
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

