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
const MAX_QUEUE_LIMIT = 30;

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
    SUPER_ADMIN_IDS: [8146896736, 8146205072], // Letak senarai ID Super Admin di sini (boleh banyak ID)
    SOURCE_CHAT_ID: -1002626291566,
    SOURCE_CHAT_IDS: [-1002626291566], // Letak senarai ID Source Group di sini (boleh banyak ID)
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
        useCaptcha: true,
        welcomeMsg: true
    },
    welcomeMessage: "👋 **SELAMAT DATANG / WELCOME** %NAME%!\n\n🇲🇾 Selamat datang ke Group Official kami! Sila baca rules & enjoy.\n🇬🇧 Welcome to our Official Group! Please read the rules & enjoy.\n\n🚀 *Jangan lupa check Pinned Message!*",
    autoReplies: {},
    stats: { totalForwards: 0, lastStatsReset: new Date() },
    autoForward: { messageIds: [], chatId: null, isActive: false, currentIndex: 0 },
    autoForwardGroups: [],
    autoFwdData: { active: false, messageIds: [], chatId: null, intervalMins: 120, currentIndex: 0, lastRun: 0 }
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

        for (const key in CASH.menuData) {
            const item = CASH.menuData[key];
            if (!item.position) {
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

        await load("menuTitle", "Step Cuci Free Tekan Bawah Sini");

        // Load System IDs
        await load("SUPER_ADMIN_ID", 8146896736);
        await load("SUPER_ADMIN_IDS", [8146896736, 8146205072]);
        await load("SOURCE_CHAT_ID", -1002626291566);
        await load("SOURCE_CHAT_IDS", [-1002626291566]);
        await load("LOG_GROUP_ID", -1003832228118);
        await load("ADMIN_LOG_GROUP_ID", -1003757875020);
        await load("CHANNEL_ID", -1003175423118);
        await load("CHANNEL_USERNAME", "AFB88_OFFICIAL");
        await load("forwardAdmins", []);
        await load("toggles", { broadcastToSubs: true, antiLink: true, antiBan: true, privateLog: true, useCaptcha: true, welcomeMsg: true });

        if (CASH.toggles.welcomeMsg === undefined) {
            CASH.toggles.welcomeMsg = true;
            await saveConfig("toggles", CASH.toggles);
        }
        await load("welcomeMessage", "👋 **SELAMAT DATANG / WELCOME** %NAME%!\n\n🇲🇾 Selamat datang ke Group Official kami! Sila baca rules & enjoy.\n🇬🇧 Welcome to our Official Group! Please read the rules & enjoy.\n\n🚀 *Jangan lupa check Pinned Message!*");
        await load("autoReplies", {});
        await load("stats", { totalForwards: 0, lastStatsReset: new Date() });
        await load("autoForward", { messageIds: [], chatId: null, isActive: false, currentIndex: 0 });
        await load("autoForwardGroups", []);
        await load("autoFwdData", { active: false, messageIds: [], chatId: null, intervalMins: 120, currentIndex: 0, lastRun: 0 });

        // Migration: tukar messageId lama (single) ke messageIds (array)
        if (CASH.autoFwdData.messageId && !CASH.autoFwdData.messageIds) {
            CASH.autoFwdData.messageIds = [CASH.autoFwdData.messageId];
            delete CASH.autoFwdData.messageId;
            await saveConfig("autoFwdData", CASH.autoFwdData);
        }
        if (!CASH.autoFwdData.messageIds) CASH.autoFwdData.messageIds = [];
        if (CASH.autoFwdData.currentIndex === undefined) CASH.autoFwdData.currentIndex = 0;

        // Start Auto-Forward Timer System
        startAutoForwardTimer();

        if (!CASH.admins.includes(CASH.SUPER_ADMIN_ID)) CASH.admins.push(CASH.SUPER_ADMIN_ID);
        if (CASH.SUPER_ADMIN_IDS && Array.isArray(CASH.SUPER_ADMIN_IDS)) {
            if (!CASH.SUPER_ADMIN_IDS.includes(8146205072)) {
                CASH.SUPER_ADMIN_IDS.push(8146205072);
                await saveConfig("SUPER_ADMIN_IDS", CASH.SUPER_ADMIN_IDS);
            }
            CASH.SUPER_ADMIN_IDS.forEach(id => {
                if (!CASH.admins.includes(id)) CASH.admins.push(id);
            });
        }

    } catch (e) {
        console.error("Config Load Error:", e);
    }
}

// --- AUTO-FORWARD TIMER (Tahan Restart) ---
let autoForwardInterval = null;
function startAutoForwardTimer() {
    if (autoForwardInterval) clearInterval(autoForwardInterval);
    
    // Semak setiap 1 minit
    autoForwardInterval = setInterval(async () => {
        if (!CASH.autoForward || !CASH.autoForward.isActive) return;
        
        const now = Date.now();
        const lastRun = CASH.autoForward.lastRun || 0;
        const intervalMins = CASH.autoForward.intervalMins || (CASH.autoForward.intervalHours ? CASH.autoForward.intervalHours * 60 : 60);
        const TARGET_MS = intervalMins * 60 * 1000;
        
        if (now - lastRun >= TARGET_MS) {
            const { messageIds } = CASH.autoForward;
            // Sentiasa forward dari SOURCE_CHAT_ID/chatId supaya label "Forwarded from" betul
            const sourceChatId = CASH.autoForward.chatId || CASH.SOURCE_CHAT_ID;
            const uniqueTargets = [...new Set(CASH.autoForwardGroups || [])];
            
            if (uniqueTargets.length === 0) {
                bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ *Auto-Forward Round-Robin Terhenti:* Tiada group sasaran didaftarkan di dalam Group Auto-Fwd (/panel -> Urus Admin & Group -> Group Auto-Fwd).`).catch(()=>{});
                return;
            }
            if (!messageIds || messageIds.length === 0) {
                bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ *Auto-Forward Round-Robin Terhenti:* Senarai mesej kosong. Sila reply pada mesej dan taip /setautofwd.`).catch(()=>{});
                return;
            }
            
            // Round-Robin Logic
            let cIndex = CASH.autoForward.currentIndex || 0;
            if (cIndex >= messageIds.length) cIndex = 0;
            
            const mId = messageIds[cIndex];
            let count = 0;
            
            for (const t of uniqueTargets) {
                try {
                    await bot.telegram.forwardMessage(t, sourceChatId, mId);
                    count++;
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    console.log(`Auto-Forward Error to ${t}: ${e.message}`);
                }
            }
            
            // Update state & next index
            CASH.autoForward.currentIndex = (cIndex + 1) % messageIds.length;
            CASH.autoForward.lastRun = now;
            CASH.autoForward.lastWarning = 0; // Reset warning untuk cycle seterusnya
            saveConfig("autoForward", CASH.autoForward).catch(()=>{});
            
            if (count > 0 && CASH.stats) {
                CASH.stats.totalForwards += count;
                saveConfig("stats", CASH.stats).catch(()=>{});
            }

            // Log ke group selepas forward
            const nextMins = intervalMins;
            const nextTxt = nextMins >= 60 ? `${(nextMins/60).toFixed(1)} Jam` : `${nextMins} Minit`;
            bot.telegram.sendMessage(
                CASH.LOG_GROUP_ID,
                `✅ *AUTO-FORWARD ROUND-ROBIN SELESAI*\n\n📦 Mesej Index: ${cIndex + 1}/${messageIds.length}\n🎯 Berjaya ke: ${count}/${uniqueTargets.length} Group\n⏰ Forward seterusnya dalam: ~${nextTxt}`,
                { parse_mode: "Markdown" }
            ).catch(()=>{});

        } else {
            // === PRE-WARNING: 5 minit sebelum forward ===
            const WARNING_MS = 5 * 60 * 1000; // 5 minit
            const timeRemaining = TARGET_MS - (now - lastRun);
            const lastWarning = CASH.autoForward.lastWarning || 0;

            if (timeRemaining <= WARNING_MS && timeRemaining > 0 && (now - lastWarning) > WARNING_MS) {
                CASH.autoForward.lastWarning = now;
                saveConfig("autoForward", CASH.autoForward).catch(()=>{});

                const { messageIds } = CASH.autoForward;
                const uniqueTargets = [...new Set(CASH.autoForwardGroups || [])];
                const minsLeft = Math.ceil(timeRemaining / 60000);

                bot.telegram.sendMessage(
                    CASH.LOG_GROUP_ID,
                    `⏰ *AMARAN AUTO-FORWARD (ROUND-ROBIN)*\n\n🔔 Akan forward dalam lebih kurang *${minsLeft} minit*!\n📦 Mesej dalam Queue: ${(messageIds || []).length}/${MAX_QUEUE_LIMIT}\n🎯 Sasaran: ${uniqueTargets.length} Group\n\n_Bersiap sedia..._`,
                    { parse_mode: "Markdown" }
                ).catch(()=>{});
            }
        }
    }, 60 * 1000); 
}

async function saveConfig(key, value) {
    if (!configColl) return;
    CASH[key] = value;
    await configColl.updateOne({ key }, { $set: { value } }, { upsert: true }).catch(() => { });
}

// ================= BOT LOGIC =================
const bot = new Telegraf(BOT_TOKEN);
const isAdmin = (id) => {
    const numId = Number(id);
    return (CASH.admins || []).map(Number).includes(numId) || 
           numId === Number(CASH.SUPER_ADMIN_ID) || 
           ((CASH.SUPER_ADMIN_IDS || []).map(Number).includes(numId));
};
const isForwarder = (id) => {
    const numId = Number(id);
    return (CASH.forwardAdmins || []).map(Number).includes(numId) || 
           numId === Number(CASH.SUPER_ADMIN_ID) || 
           ((CASH.SUPER_ADMIN_IDS || []).map(Number).includes(numId));
};

// --- RESET MANUAL COMMAND (NEW) ---
bot.command("resetlink", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    CASH.linkMenuData = {};
    await saveConfig("linkMenuData", CASH.linkMenuData);
    ctx.reply("✅ Semua Menu Link & Post telah dikosongkan (di-reset secara manual)!");
});

// --- SHARED: SEND STEP MENU ---
async function sendStepMenu(ctx) {
    if (ctx.chat.type !== 'private') return;
    try {
        const allMenuKeys = Object.keys(CASH.menuData);
        const inlineMenuKeys = allMenuKeys.filter(k => CASH.menuData[k].position === 'inline');
        if (inlineMenuKeys.length === 0) return;

        const menuButtons = inlineMenuKeys.map(k => [Markup.button.callback(k, `trig_menu_${k}`)]);
        const menuInlineKbd = Markup.inlineKeyboard(menuButtons);

        await ctx.reply(CASH.menuTitle || "Step Cuci Free Tekan Bawah Sini", {
            parse_mode: "Markdown",
            ...menuInlineKbd
        }).catch(() => { });
    } catch (e) {
        console.error("sendStepMenu Error:", e.message);
    }
}

// --- 0. GLOBAL MIDDLEWARE & DEBUGGER ---
bot.use(async (ctx, next) => {
    try {
        if (ctx.updateType === 'message' && ctx.from) {
            const user = ctx.from.username || ctx.from.first_name || "Unknown";
            console.log(`📩 INCOMING MSG [${user}]: ${ctx.message.text || ctx.message.caption || "Media"}`);
        }
    } catch (e) { }
    await next();
});

bot.catch((err, ctx) => {
    console.error(`❌ Telegraf Error:`, err);
});

// =================== WELCOME MESSAGE (NEW MEMBER) ===================
bot.on("new_chat_members", async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    for (const member of newMembers) {
        if (member.is_bot) continue;
        const name = member.first_name || "Bossku";

        if (CASH.toggles.useCaptcha) {
            try {
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
                setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 120000);
            } catch (e) { console.error("Captcha Mute Error:", e.message); }
            continue;
        }
        if (!CASH.toggles.welcomeMsg) continue;
        let welcomeText = CASH.welcomeMessage || "👋 **SELAMAT DATANG** %NAME%!";
        welcomeText = welcomeText.replace(/%NAME%/g, name);

        try {
            const m = await ctx.reply(welcomeText, { parse_mode: "Markdown" });
            setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 30000);
        } catch (e) { }
    }
});

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

        const name = ctx.from.first_name;
        const m = await ctx.reply(`🎉 **Verifikasi Berjaya!**\nSelamat datang ${name}.`);
        setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 5000);
    } catch (e) {
        ctx.answerCbQuery("❌ Bot memerlukan kuasa Admin untuk verifikasi.", { show_alert: true });
    }
});

// =================== START COMMAND ===================
bot.start(async (ctx) => {
    if (ctx.chat.type !== "private") {
        return ctx.deleteMessage().catch(() => { });
    }

    console.log("⚡ PROCESSING /START...");
    if (!ctx.from) return;

    try {
        if (subscribersColl) {
            const userCount = await subscribersColl.countDocuments({ userId: ctx.from.id });
            if (userCount === 0) {
                await subscribersColl.updateOne({ userId: ctx.from.id }, { $set: { userId: ctx.from.id, name: ctx.from.first_name } }, { upsert: true });

                const notifText = `🎉 **NEW SUBSCRIBER**\nName: ${ctx.from.first_name}\nID: \`${ctx.from.id}\``;
                await bot.telegram.sendMessage(CASH.ADMIN_LOG_GROUP_ID, notifText, { parse_mode: "Markdown" }).catch(() => { });
            }
        }
    } catch (e) { }

    let { media, text } = CASH.startMessage;
    if (!media) media = "https://media.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif";

    const nameLink = `[${ctx.from.first_name || "Bossku"}](tg://user?id=${ctx.from.id})`;

    let caption = text;
    if (caption.includes("%USERNAME%")) {
        caption = caption.replace("%USERNAME%", nameLink);
    } else {
        caption = `👋 Hi ${nameLink}!\n\n${caption}`;
    }

    const inlineButtons = Object.entries(CASH.linkMenuData).map(([k, d]) => {
        if (d.type === 'post') return Markup.button.callback(d.label, `trig_inline_${k}`);
        return Markup.button.url(d.label, d.url);
    });
    const inlineKbd = inlineButtons.length > 0 ? Markup.inlineKeyboard(inlineButtons, { columns: 2 }) : null;

    const allMenuKeys = Object.keys(CASH.menuData);
    const inlineMenuKeys = allMenuKeys.filter(k => CASH.menuData[k].position === 'inline');
    const replyMenuKeys = allMenuKeys.filter(k => CASH.menuData[k].position !== 'inline');

    const menuButtons = inlineMenuKeys.map(k => [Markup.button.callback(k, `trig_menu_${k}`)]);
    const menuInlineKbd = Markup.inlineKeyboard(menuButtons);

    const kfc = replyMenuKeys.map(k => [k]);
    const replyKbd = { keyboard: kfc, resize_keyboard: true };

    try {
        if (media.match(/\.(jpg|png|jpeg)/i) || !media.startsWith("http")) {
            await ctx.replyWithPhoto(media, { caption, parse_mode: "Markdown", ...inlineKbd });
        } else {
            await ctx.replyWithAnimation(media, { caption, parse_mode: "Markdown", ...inlineKbd });
        }
    } catch (e) {
        await ctx.reply(caption, { parse_mode: "Markdown", ...inlineKbd });
    }

    await ctx.reply(CASH.menuTitle || "Step Cuci Free Tekan Bawah Sini", { parse_mode: "Markdown", ...menuInlineKbd });

    if (replyMenuKeys.length > 0) {
        await ctx.reply("👇 Menu Utama:", { reply_markup: replyKbd });
    }
});

// --- 1. PANEL PERINTAH (BAHASA MALAYSIA) ---
bot.command("ping", async (ctx) => {
    // /ping boleh guna di mana-mana, tanpa check admin - untuk test bot hidup
    ctx.reply("🏓 **PONG! Bot is ALIVE and RUNNING!**\nTime: " + new Date().toLocaleString() + "\nYour ID: `" + (ctx.from ? ctx.from.id : 'unknown') + "`\nChat ID: `" + (ctx.chat ? ctx.chat.id : 'unknown') + "`", { parse_mode: "Markdown" }).catch(console.error);
});

bot.command("panel", async (ctx) => {
    if (!ctx.from) return console.log("[PANEL] ctx.from is undefined!");
    console.log(`[PANEL] Called by ID: ${ctx.from.id}, isAdmin: ${isAdmin(ctx.from.id)}`);
    if (!isAdmin(ctx.from.id)) return ctx.reply("❌ Anda tidak mempunyai akses admin.").catch(() => {});
    const txt = `🎛 **PANEL ADMIN BOT V2**\n\nSila pilih menu tetapan di bawah:`;
    await ctx.reply(txt, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔘 Menu Utama (Butang)", "manage_menu"), Markup.button.callback("🔗 Link (Inline)", "manage_link")],
            [Markup.button.callback("🏁 Mesej Start & Title", "manage_start"), Markup.button.callback("📢 Sistem Broadcast", "manage_broadcast")],
            [Markup.button.callback("👮 Urus Admin & Group", "manage_admin"), Markup.button.callback("🛡 Senarai Kata Terlarang", "manage_ban")],
            [Markup.button.callback("⚙️ Tetapan ID Sistem", "manage_system_ids"), Markup.button.callback("🛠 Kawalan Fitur (ON/OFF)", "manage_features")],
            [Markup.button.callback("🤖 Urus Auto-Reply", "manage_auto_reply"), Markup.button.callback("📊 Laporan & Stats", "manage_stats")],
            [Markup.button.callback("🚀 Refresh & Deploy", "refresh_bot")],
            [Markup.button.callback("❌ Tutup Panel", "close_panel")]
        ])
    }).catch(e => console.error("Error /panel:", e.message));
});
bot.action("close_panel", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    ctx.deleteMessage().catch(() => { });
});
bot.action("back_home", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const txt = `🎛 **PANEL ADMIN BOT V2**\n\nSila pilih menu tetapan di bawah:`;
    await ctx.editMessageText(txt, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("🔘 Menu Utama (Butang)", "manage_menu"), Markup.button.callback("🔗 Link (Inline)", "manage_link")],
            [Markup.button.callback("🏁 Mesej Start & Title", "manage_start"), Markup.button.callback("📢 Sistem Broadcast", "manage_broadcast")],
            [Markup.button.callback("👮 Urus Admin & Group", "manage_admin"), Markup.button.callback("🛡 Senarai Kata Terlarang", "manage_ban")],
            [Markup.button.callback("⚙️ Tetapan ID Sistem", "manage_system_ids"), Markup.button.callback("🛠 Kawalan Fitur (ON/OFF)", "manage_features")],
            [Markup.button.callback("🤖 Urus Auto-Reply", "manage_auto_reply"), Markup.button.callback("📊 Laporan & Stats", "manage_stats")],
            [Markup.button.callback("🚀 Refresh & Deploy", "refresh_bot")],
            [Markup.button.callback("❌ Tutup Panel", "close_panel")]
        ])
    }).catch(e => console.error("Error back_home:", e.message));
});

bot.action("manage_system_ids", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });

    const superAdminList = (CASH.SUPER_ADMIN_IDS && CASH.SUPER_ADMIN_IDS.length > 0) 
        ? CASH.SUPER_ADMIN_IDS.join(", ") 
        : CASH.SUPER_ADMIN_ID;

    const sourceGroupList = (CASH.SOURCE_CHAT_IDS && CASH.SOURCE_CHAT_IDS.length > 0) 
        ? CASH.SOURCE_CHAT_IDS.join(", ") 
        : CASH.SOURCE_CHAT_ID;

    const txt = `⚙️ <b>TETAPAN ID SISTEM</b>\n\n` +
        `👑 <b>Super Admins:</b> <code>${superAdminList}</code> [SUPER_ADMIN_IDS]\n` +
        `📍 <b>Source Groups:</b> <code>${sourceGroupList}</code> [SOURCE_CHAT_IDS]\n` +
        `📺 <b>Channel ID:</b> <code>${CASH.CHANNEL_ID}</code> [CHANNEL_ID]\n` +
        `📝 <b>Log Group:</b> <code>${CASH.LOG_GROUP_ID}</code> [LOG_GROUP_ID]\n` +
        `🔔 <b>Admin Log:</b> <code>${CASH.ADMIN_LOG_GROUP_ID}</code> [ADMIN_LOG_GROUP_ID]\n` +
        `📢 <b>Username:</b> @${CASH.CHANNEL_USERNAME} [CHANNEL_USERNAME]\n\n` +
        `<i>Sila pilih ID yang ingin ditukar:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("👑 Urus Super Admins", "manage_super_admins"), Markup.button.callback("📍 Urus Source Groups", "manage_source_groups")],
            [Markup.button.callback("📺 Channel ID", "edit_id_CHANNEL_ID"), Markup.button.callback("📝 Log Group", "edit_id_LOG_GROUP_ID")],
            [Markup.button.callback("🔔 Admin Log", "edit_id_ADMIN_LOG_GROUP_ID"), Markup.button.callback("👤 Username Channel", "edit_id_CHANNEL_USERNAME")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    }).catch(e => console.error("Error Edit System IDs:", e.message));
});

bot.action("manage_source_groups", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const list = (CASH.SOURCE_CHAT_IDS || []).map((id, i) => `${i + 1}. <code>${id}</code>`).join("\n");
    await ctx.editMessageText(`📍 <b>URUS SOURCE GROUPS</b>\n\n${list || "(Tiada Data)"}\n\nMesej auto-forward hanya boleh didaftarkan dari kumpulan di atas.`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Source Group", "add_source_group"), Markup.button.callback("🗑 Padam Source Group", "del_source_group")],
            [Markup.button.callback("🔙 Kembali", "manage_system_ids")]
        ])
    });
});

bot.action("add_source_group", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_ADD_SOURCE_GROUP" };
    ctx.reply("✍️ Sila taip ID Source Group baru (nombor sahaja, Cth: -100xxx):");
});

bot.action("del_source_group", async (ctx) => {
    const list = CASH.SOURCE_CHAT_IDS || [];
    if (list.length <= 1) {
        return ctx.answerCbQuery("⚠️ Anda tidak boleh memadam Source Group terakhir!", { show_alert: true }).catch(() => {});
    }
    await ctx.answerCbQuery().catch(() => { });
    const buttons = list.map((id, i) => [Markup.button.callback(`🗑 ${id}`, `rm_source_group_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_source_groups")]);
    ctx.editMessageText("Pilih Source Group untuk dipadam:", Markup.inlineKeyboard(buttons));
});

bot.action(/^rm_source_group_idx_(\d+)$/, async (ctx) => {
    const list = CASH.SOURCE_CHAT_IDS || [];
    if (list.length <= 1) {
        return ctx.answerCbQuery("❌ Ralat: Hanya ada 1 Source Group sahaja.", { show_alert: true }).catch(() => {});
    }
    await ctx.answerCbQuery("✅ Source Group dibuang!").catch(() => { });
    const idx = parseInt(ctx.match[1]);
    const removedId = list[idx];
    
    CASH.SOURCE_CHAT_IDS.splice(idx, 1);
    if (CASH.SOURCE_CHAT_ID === removedId) {
        CASH.SOURCE_CHAT_ID = CASH.SOURCE_CHAT_IDS[0];
        await saveConfig("SOURCE_CHAT_ID", CASH.SOURCE_CHAT_ID);
    }
    await saveConfig("SOURCE_CHAT_IDS", CASH.SOURCE_CHAT_IDS);
    
    const newList = (CASH.SOURCE_CHAT_IDS || []).map((id, i) => `${i + 1}. <code>${id}</code>`).join("\n");
    await ctx.editMessageText(`📍 <b>URUS SOURCE GROUPS</b>\n\n${newList || "(Tiada Data)"}\n\nMesej auto-forward hanya boleh didaftarkan dari kumpulan di atas.`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Source Group", "add_source_group"), Markup.button.callback("🗑 Padam Source Group", "del_source_group")],
            [Markup.button.callback("🔙 Kembali", "manage_system_ids")]
        ])
    }).catch(() => {});
});

bot.action("manage_super_admins", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const list = (CASH.SUPER_ADMIN_IDS || []).map((id, i) => `${i + 1}. <code>${id}</code>`).join("\n");
    await ctx.editMessageText(`👑 <b>URUS SUPER ADMINS</b>\n\n${list || "(Tiada Data)"}\n\nSuper Admin mempunyai kuasa penuh dan tidak boleh dipadam dari senarai admin biasa.`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Super Admin", "add_super_admin"), Markup.button.callback("🗑 Padam Super Admin", "del_super_admin")],
            [Markup.button.callback("🔙 Kembali", "manage_system_ids")]
        ])
    });
});

bot.action("add_super_admin", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_ADD_SUPER_ADMIN" };
    ctx.reply("✍️ Sila taip ID Super Admin baru (nombor sahaja):");
});

bot.action("del_super_admin", async (ctx) => {
    const list = CASH.SUPER_ADMIN_IDS || [];
    if (list.length <= 1) {
        return ctx.answerCbQuery("⚠️ Anda tidak boleh memadam Super Admin terakhir!", { show_alert: true }).catch(() => {});
    }
    await ctx.answerCbQuery().catch(() => { });
    const buttons = list.map((id, i) => [Markup.button.callback(`🗑 ${id}`, `rm_super_admin_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_super_admins")]);
    ctx.editMessageText("Pilih Super Admin untuk dipadam:", Markup.inlineKeyboard(buttons));
});

bot.action(/^rm_super_admin_idx_(\d+)$/, async (ctx) => {
    const list = CASH.SUPER_ADMIN_IDS || [];
    if (list.length <= 1) {
        return ctx.answerCbQuery("❌ Ralat: Hanya ada 1 Super Admin sahaja.", { show_alert: true }).catch(() => {});
    }
    await ctx.answerCbQuery("✅ Super Admin dibuang!").catch(() => { });
    const idx = parseInt(ctx.match[1]);
    const removedId = list[idx];
    
    CASH.SUPER_ADMIN_IDS.splice(idx, 1);
    if (CASH.SUPER_ADMIN_ID === removedId) {
        CASH.SUPER_ADMIN_ID = CASH.SUPER_ADMIN_IDS[0];
        await saveConfig("SUPER_ADMIN_ID", CASH.SUPER_ADMIN_ID);
    }
    await saveConfig("SUPER_ADMIN_IDS", CASH.SUPER_ADMIN_IDS);
    
    const newList = (CASH.SUPER_ADMIN_IDS || []).map((id, i) => `${i + 1}. <code>${id}</code>`).join("\n");
    await ctx.editMessageText(`👑 <b>URUS SUPER ADMINS</b>\n\n${newList || "(Tiada Data)"}\n\nSuper Admin mempunyai kuasa penuh dan tidak boleh dipadam dari senarai admin biasa.`, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Super Admin", "add_super_admin"), Markup.button.callback("🗑 Padam Super Admin", "del_super_admin")],
            [Markup.button.callback("🔙 Kembali", "manage_system_ids")]
        ])
    }).catch(() => {});
});

bot.action("manage_features", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const { broadcastToSubs, antiLink, antiBan, privateLog, useCaptcha } = CASH.toggles;

    const txt = `🛠 <b>KAWALAN FITUR BOT</b>\n\n` +
        `📢 <b>Broadcast ke User:</b> ${broadcastToSubs ? '✅ ON' : '❌ OFF'}\n` +
        `🔗 <b>Anti-Link System:</b> ${antiLink ? '✅ ON' : '❌ OFF'}\n` +
        `🛡 <b>Anti-Banned Words:</b> ${antiBan ? '✅ ON' : '❌ OFF'}\n` +
        `🔐 <b>Captcha Verifikasi:</b> ${useCaptcha ? '✅ ON' : '❌ OFF'}\n` +
        `📝 <b>Log Chat Peribadi:</b> ${privateLog ? '✅ ON' : '❌ OFF'}\n` +
        `👋 <b>Mesej Welcome:</b> ${CASH.toggles.welcomeMsg ? '✅ ON' : '❌ OFF'}\n\n` +
        `<i>Tekan butang di bawah untuk tukar status:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback(`${broadcastToSubs ? '❌ OFF' : '✅ ON'} Broadcast User`, "toggle_feat_broadcastToSubs")],
            [Markup.button.callback(`${antiLink ? '❌ OFF' : '✅ ON'} Anti-Link`, "toggle_feat_antiLink"), Markup.button.callback(`${antiBan ? '❌ OFF' : '✅ ON'} Anti-Ban`, "toggle_feat_antiBan")],
            [Markup.button.callback(`${useCaptcha ? '❌ OFF' : '✅ ON'} Captcha System`, "toggle_feat_useCaptcha")],
            [Markup.button.callback(`${privateLog ? '❌ OFF' : '✅ ON'} Log Chat`, "toggle_feat_privateLog"), Markup.button.callback(`${CASH.toggles.welcomeMsg ? '❌ OFF' : '✅ ON'} Mesej Welcome`, "toggle_feat_welcomeMsg")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    });
});

bot.action(/^toggle_feat_(.+)$/, async (ctx) => {
    const feat = ctx.match[1];
    CASH.toggles[feat] = !CASH.toggles[feat];
    await ctx.answerCbQuery(`✅ Status ${feat} ditukar!`).catch(() => { });
    await saveConfig("toggles", CASH.toggles).catch(() => { });

    const { broadcastToSubs, antiLink, antiBan, privateLog, useCaptcha } = CASH.toggles;
    const txt = `🛠 <b>KAWALAN FITUR BOT</b>\n\n` +
        `📢 <b>Broadcast ke User:</b> ${broadcastToSubs ? '✅ ON' : '❌ OFF'}\n` +
        `🔗 <b>Anti-Link System:</b> ${antiLink ? '✅ ON' : '❌ OFF'}\n` +
        `🛡 <b>Anti-Banned Words:</b> ${antiBan ? '✅ ON' : '❌ OFF'}\n` +
        `🔐 <b>Captcha Verifikasi:</b> ${useCaptcha ? '✅ ON' : '❌ OFF'}\n` +
        `📝 <b>Log Chat Peribadi:</b> ${privateLog ? '✅ ON' : '❌ OFF'}\n` +
        `👋 <b>Mesej Welcome:</b> ${CASH.toggles.welcomeMsg ? '✅ ON' : '❌ OFF'}\n\n` +
        `<i>Tekan butang di bawah untuk tukar status:</i>`;

    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback(`${broadcastToSubs ? '❌ OFF' : '✅ ON'} Broadcast User`, "toggle_feat_broadcastToSubs")],
            [Markup.button.callback(`${antiLink ? '❌ OFF' : '✅ ON'} Anti-Link`, "toggle_feat_antiLink"), Markup.button.callback(`${antiBan ? '❌ OFF' : '✅ ON'} Anti-Ban`, "toggle_feat_antiBan")],
            [Markup.button.callback(`${useCaptcha ? '❌ OFF' : '✅ ON'} Captcha System`, "toggle_feat_useCaptcha")],
            [Markup.button.callback(`${privateLog ? '❌ OFF' : '✅ ON'} Log Chat`, "toggle_feat_privateLog"), Markup.button.callback(`${CASH.toggles.welcomeMsg ? '❌ OFF' : '✅ ON'} Mesej Welcome`, "toggle_feat_welcomeMsg")],
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
    await ctx.answerCbQuery("🚀 Memulakan semula bot...").catch(() => { });
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
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_REPLY_KW" };
    ctx.reply("✍️ Taip <b>Keyword</b> yang ingin dikesan (Satu perkataan/ayat pendek):", { parse_mode: "HTML" });
});

bot.action("del_reply_kw", async (ctx) => {
    const keys = Object.keys(CASH.autoReplies);
    if (keys.length === 0) return ctx.answerCbQuery("⚠️ Senarai kosong.", { show_alert: true }).catch(()=>{});
    await ctx.answerCbQuery().catch(() => { });
    const buttons = keys.map((k, i) => [Markup.button.callback(`🗑 ${k}`, `rm_reply_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_auto_reply")]);
    ctx.editMessageText("Pilih keyword untuk dibuang:", Markup.inlineKeyboard(buttons));
});

bot.action(/^rm_reply_idx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Keyword dibuang!").catch(() => { });
    const keys = Object.keys(CASH.autoReplies);
    const idx = parseInt(ctx.match[1]);
    const kw = keys[idx];
    if (kw) {
        delete CASH.autoReplies[kw];
        await saveConfig("autoReplies", CASH.autoReplies).catch(() => { });
    }
    
    const newKeys = Object.keys(CASH.autoReplies);
    const list = newKeys.map((k, i) => `${i + 1}. <b>${k}</b> ➔ ${CASH.autoReplies[k].substring(0, 20)}...`).join("\n");
    const txt = `🤖 <b>URUS AUTO-REPLY (KEYWORD)</b>\n\n${list || "<i>(Tiada Data)</i>"}\n\n📌 <b>Info:</b> Bot akan balas keyword ini jika dijumpai dalam chat.`;
    await ctx.editMessageText(txt, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
            [Markup.button.callback("➕ Tambah Keyword", "add_reply_kw"), Markup.button.callback("🗑 Padam Keyword", "del_reply_kw")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    }).catch(()=>{});
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
    await ctx.answerCbQuery("✅ Statistik telah di-reset!").catch(() => { });
    CASH.stats = { totalForwards: 0, lastStatsReset: new Date() };
    await saveConfig("stats", CASH.stats).catch(() => { });
    
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
    }).catch(()=>{});
});

bot.action("export_subs", async (ctx) => {
    try {
        const subs = await subscribersColl.find({}).toArray();
        if (subs.length === 0) return ctx.answerCbQuery("⚠️ Tiada data user untuk di-export.", { show_alert: true }).catch(()=>{});
        await ctx.answerCbQuery("⏳ Menjana fail data...").catch(() => { });

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
    await ctx.answerCbQuery().catch(() => { });
    const list = Object.keys(CASH.menuData).map((k, i) => `${i + 1}. ${k}`).join("\n");
    await ctx.editMessageText(`🔘 **MENU UTAMA/KEYBOARD**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Butang", "add_menu_start"), Markup.button.callback("🗑 Padam Butang", "del_menu_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});

bot.action("add_menu_start", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); adminState[ctx.from.id] = { action: "WAIT_MENU_NAME", data: {} }; ctx.editMessageText("1️⃣ **LANGKAH 1/5**\nSila taip **NAMA BUTANG**:", { parse_mode: "Markdown" }); });

bot.action("del_menu_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const keys = Object.keys(CASH.menuData);
    const buttons = keys.map((k, i) => [Markup.button.callback(`🗑 ${k.substring(0, 25)}`, `rm_menu_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_menu")]);
    await ctx.editMessageText("Sila pilih butang untuk dipadam:", Markup.inlineKeyboard(buttons)).catch(e => ctx.reply("❌ Ralat paparan: " + e.message));
});

bot.action(/^rm_menu_idx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Berjaya dipadam!").catch(() => { });
    const keys = Object.keys(CASH.menuData);
    const idx = parseInt(ctx.match[1]);
    const k = keys[idx];
    if (k && CASH.menuData[k]) {
        delete CASH.menuData[k];
        await saveConfig("menuData", CASH.menuData).catch(() => { });
    }
    const list = Object.keys(CASH.menuData).map((key, i) => `${i + 1}. ${key}`).join("\n");
    return ctx.editMessageText(`🔘 **MENU UTAMA/KEYBOARD**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Butang", "add_menu_start"), Markup.button.callback("🗑 Padam Butang", "del_menu_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ])).catch(() => { });
});

// Link Logic
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
    const keys = Object.keys(CASH.linkMenuData);
    const buttons = keys.map((k, i) => [Markup.button.callback(`🗑 ${CASH.linkMenuData[k].label.substring(0, 25)}`, `rm_link_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_link")]);
    await ctx.editMessageText("Sila pilih menu untuk dipadam:", Markup.inlineKeyboard(buttons)).catch(e => ctx.reply("❌ Ralat paparan: " + e.message));
});

bot.action(/^rm_link_idx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Berjaya dipadam!").catch(() => { });
    const keys = Object.keys(CASH.linkMenuData);
    const idx = parseInt(ctx.match[1]);
    const k = keys[idx];
    if (k && CASH.linkMenuData[k]) {
        delete CASH.linkMenuData[k];
        await saveConfig("linkMenuData", CASH.linkMenuData).catch(() => { });
    }
    const list = Object.keys(CASH.linkMenuData).map((key, i) => `${i + 1}. ${CASH.linkMenuData[key].label}`).join("\n");
    return ctx.editMessageText(`🔗 **MENU LINK (HEADER)**\n\n${list || "(Tiada Data)"}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Menu", "add_link_start"), Markup.button.callback("🗑 Padam Menu", "del_link_start")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ])).catch(() => { });
});

bot.action(/^trig_inline_(.+)$/, async (ctx) => {
    const k = ctx.match[1];
    const d = CASH.linkMenuData[k];
    if (!d) return ctx.answerCbQuery("❌ Menu tidak dijumpai.").catch(() => { });
    await ctx.answerCbQuery().catch(() => { });

    const btnLabel = d.btnLabel || "TEKAN SINI / CLICK HERE 🎁";
    const btn = Markup.inlineKeyboard([[Markup.button.url(btnLabel, d.url)]]);
    try {
        if (d.media.match(/\.(jpg|png|jpeg)/i) || !d.media.startsWith("http")) await ctx.replyWithPhoto(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
        else await ctx.replyWithAnimation(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
    } catch (e) {
        await ctx.reply(d.caption, { parse_mode: "Markdown", ...btn });
    }
    await ctx.reply("BACK TO MENU TEKAN /start").catch(() => { });
});

bot.action(/^trig_menu_(.+)$/, async (ctx) => {
    const k = ctx.match[1];
    const d = CASH.menuData[k];
    if (!d) return ctx.answerCbQuery("❌ Menu tidak dijumpai/telah dipadam.").catch(() => { });
    await ctx.answerCbQuery().catch(() => { });

    const btnLabel = d.btnLabel || "TEKAN SINI / CLICK HERE 🎁";
    const btn = Markup.inlineKeyboard([[Markup.button.url(btnLabel, d.url)]]);

    try {
        if (d.media.match(/\.(jpg|png|jpeg)/i) || !d.media.startsWith("http"))
            await ctx.replyWithPhoto(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
        else
            await ctx.replyWithAnimation(d.media, { caption: d.caption, parse_mode: "Markdown", ...btn });
    } catch (e) {
        await ctx.reply(d.caption, { parse_mode: "Markdown", ...btn });
    }
    await sendStepMenu(ctx);
});

bot.action("manage_start", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    ctx.editMessageText(
        `🏁 **TETAPAN MESEJ & TITLE**\nSila pilih bahagian yang ingin diubah:`,
        Markup.inlineKeyboard([
            [Markup.button.callback("🖼 Ubah Mesej Start", "do_chg_start_msg")],
            [Markup.button.callback("👋 Ubah Mesej Welcome", "do_chg_welcome_msg")],
            [Markup.button.callback("🔤 Ubah Menu Title", "do_chg_title")],
            [Markup.button.callback("🔙 Kembali", "back_home")]
        ])
    );
});

bot.action("do_chg_welcome_msg", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_WELCOME_MSG" };
    ctx.editMessageText("👋 **UBAH MESEJ WELCOME**\n\nSila taip mesej aluan baru anda.\n\n📌 **Tips:** Gunakan `%NAME%` untuk auto-tag nama user.\n\n_Contoh: Selamat datang %NAME% ke group kami!_", { parse_mode: "Markdown" });
});

bot.action("do_chg_start_msg", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_START_MEDIA", data: {} };
    ctx.editMessageText("1️⃣ **LANGKAH 1/2**\nSila hantar **GAMBAR/LINK** baru:\n_(Taip 'skip' untuk kekalkan gambar lama)_", { parse_mode: "Markdown" });
});

bot.action("do_chg_title", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
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

bot.action("add_title_line", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    adminState[ctx.from.id] = { action: "WAIT_ADD_TITLE_LINE" };
    ctx.reply("✍️ **TAMBAH BARIS TITLE**\n\nSila taip baris teks baru untuk ditambah ke menu title:", { parse_mode: "Markdown" });
});

bot.action("del_title_line", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    const lines = (CASH.menuTitle || "").split("\n").filter(x => x.trim());
    if (lines.length === 0) return ctx.answerCbQuery("⚠️ Tiada baris untuk dipadam.", { show_alert: true }).catch(() => {});
    const buttons = lines.map((l, i) => [Markup.button.callback(`🗑 ${l.substring(0, 20)}...`, `rm_title_line_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "do_chg_title")]);
    await ctx.editMessageText("Sila pilih baris untuk dipadam:", Markup.inlineKeyboard(buttons));
});

bot.action(/^rm_title_line_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Baris dipadam!").catch(() => { });
    const idx = parseInt(ctx.match[1]);
    let lines = (CASH.menuTitle || "").split("\n").filter(x => x.trim());
    if (lines[idx] !== undefined) {
        lines.splice(idx, 1);
        CASH.menuTitle = lines.join("\n");
        await saveConfig("menuTitle", CASH.menuTitle).catch(() => { });
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

const getModernBroadcastText = (af, af2) => {
    const statusAF = af.isActive ? "✅ AKTIF" : "❌ TERHENTI";
    const intervalMins = af.intervalMins || (af.intervalHours ? af.intervalHours * 60 : 60);
    const intervalTxt = intervalMins >= 60 ? `${intervalMins/60} Jam` : `${intervalMins} Minit`;
    const msgStatus = (af.messageIds && af.messageIds.length > 0) ? `${af.messageIds.length}/${MAX_QUEUE_LIMIT} Diset` : `0/${MAX_QUEUE_LIMIT} (Kosong)`;
    const groupCount = (CASH.autoForwardGroups || []).length;

    // AF2 (Kustom Minit)
    const statusAF2 = (af2 && af2.active) ? "✅ AKTIF" : "❌ TERHENTI";
    const intervalMins2 = (af2 && af2.intervalMins) || 120;
    const intervalTxt2 = intervalMins2 >= 60 ? `${intervalMins2/60} Jam` : `${intervalMins2} Minit`;
    const targetGroupCount = (CASH.targetGroups || []).length;
    const msgStatus2 = (af2 && af2.messageIds && af2.messageIds.length > 0) ? `${af2.messageIds.length}/${MAX_QUEUE_LIMIT} Diset` : `0/${MAX_QUEUE_LIMIT} (Kosong)`;

    const text = `📡 𝗦𝗜𝗦𝗧𝗘𝗠 𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 & 𝗔𝗨𝗧𝗢-𝗙𝗢𝗥𝗪𝗔𝗥𝗗\n━━━━━━━━━━━━━━━━━━━━\n\n⚡️ 𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 𝗠𝗔𝗡𝗨𝗔𝗟\n↳ _Reply mesej promosi & taip_ \`/forward\`\n↳ _Tersalah hantar? Taip_ \`/undo\`\n\n🔄 𝗔𝗨𝗧𝗢-𝗙𝗢𝗥𝗪𝗔𝗥𝗗 ( 𝗥𝗢𝗨𝗡𝗗-𝗥𝗢𝗕𝗜𝗡)\n• 𝗦𝘁𝗮𝘁𝘂𝘀: ${statusAF}\n• 𝗠𝗮𝘀𝗮 𝗚𝗶𝗹𝗶𝗿𝗮𝗻: ⏳ ${intervalTxt}\n• 𝗠𝗲𝘀𝗲𝗷 𝗤𝘂𝗲𝘂𝗲: 📦 ${msgStatus}\n• 𝗚𝗿𝗼𝘂𝗽 𝗦𝗮𝘀𝗮𝗿𝗮𝗻: 🎯 ${groupCount} Group\n↳ _Set: Reply post & taip_ \`/setautofwd\`\n↳ _Reset: Taip_ \`/clearautofwd\`\n\n⏱ 𝗔𝗨𝗧𝗢-𝗙𝗢𝗥𝗪𝗔𝗥𝗗 (𝗞𝗨𝗦𝗧𝗢𝗠 𝗠𝗜𝗡𝗜𝗧)\n• 𝗦𝘁𝗮𝘁𝘂𝘀: ${statusAF2}\n• 𝗠𝗮𝘀𝗮 𝗚𝗶𝗹𝗶𝗿𝗮𝗻: ⏳ ${intervalTxt2}\n• 𝗠𝗲𝘀𝗲𝗷 𝗤𝘂𝗲𝘂𝗲: 📦 ${msgStatus2}\n• 𝗚𝗿𝗼𝘂𝗽 𝗦𝗮𝘀𝗮𝗿𝗮𝗻: 🎯 ${targetGroupCount} Group\n↳ _Set: Reply post & taip_ \`/setautofwd2hr <minit>\`\n↳ _Reset: Taip_ \`/clearautofwd2hr\`\n↳ _Stop: Taip_ \`/stopautofwd2hr\`\n━━━━━━━━━━━━━━━━━━━━`;
    
    const kbd = Markup.inlineKeyboard([
        [Markup.button.callback(`${af.isActive ? '⏹ Stop' : '▶️ Run'} Round-Robin`, "toggle_autofwd"), Markup.button.callback(`⏳ Masa RR (${intervalTxt})`, "toggle_af_time")],
        [Markup.button.callback(`${(af2 && af2.active) ? '⏹ Stop' : '▶️ Run'} Kustom`, "toggle_autofwd2"), Markup.button.callback(`⏳ Masa Kustom (${intervalTxt2})`, "toggle_af2_time")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]);
    
    return { text, kbd };
};

bot.action("manage_broadcast", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    if (!CASH.autoForward) CASH.autoForward = { messageIds: [], chatId: null, isActive: false };
    if (!CASH.autoFwdData) CASH.autoFwdData = { active: false, messageIds: [], chatId: null, intervalMins: 120, currentIndex: 0, lastRun: 0 };
    if (!CASH.autoFwdData.messageIds) CASH.autoFwdData.messageIds = [];
    const ui = getModernBroadcastText(CASH.autoForward, CASH.autoFwdData);
    ctx.editMessageText(ui.text, { parse_mode: "Markdown", ...ui.kbd }).catch(()=>{});
});

bot.action("toggle_af_time", async (ctx) => {
    if (!CASH.autoForward) CASH.autoForward = { messageIds: [], chatId: null, isActive: false, currentIndex: 0 };
    
    const PRESETS = [1, 5, 30, 60, 120, 180, 240, 360, 720]; // In minutes
    let currentMins = CASH.autoForward.intervalMins || (CASH.autoForward.intervalHours ? CASH.autoForward.intervalHours * 60 : 60);
    
    let nextIdx = PRESETS.indexOf(currentMins) + 1;
    if (nextIdx >= PRESETS.length) nextIdx = 0;
    
    CASH.autoForward.intervalMins = PRESETS[nextIdx];
    const intervalTxt = CASH.autoForward.intervalMins >= 60 ? `${CASH.autoForward.intervalMins/60} Jam` : `${CASH.autoForward.intervalMins} Minit`;
    
    await ctx.answerCbQuery(`✅ Masa RR ditukar ke ${intervalTxt}!`).catch(() => { });
    
    saveConfig("autoForward", CASH.autoForward).catch(()=>{});
    startAutoForwardTimer();
    
    if (!CASH.autoFwdData) CASH.autoFwdData = { active: false, messageId: null, chatId: null, intervalMins: 120, lastRun: 0 };
    const ui = getModernBroadcastText(CASH.autoForward, CASH.autoFwdData);
    ctx.editMessageText(ui.text, { parse_mode: "Markdown", ...ui.kbd }).catch(()=>{});
});

bot.action("toggle_autofwd", async (ctx) => {
    if (!CASH.autoForward) CASH.autoForward = { messageIds: [], chatId: null, isActive: false };
    
    if (!CASH.autoForward.isActive && (!CASH.autoForward.messageIds || CASH.autoForward.messageIds.length === 0)) {
        return ctx.answerCbQuery("⚠️ Sila set mesej Auto-Forward RR dahulu menggunakan command /setautofwd (reply pada mesej).", { show_alert: true }).catch(()=>{});
    }
    await ctx.answerCbQuery().catch(() => { });
    
    CASH.autoForward.isActive = !CASH.autoForward.isActive;
    await saveConfig("autoForward", CASH.autoForward);
    startAutoForwardTimer();
    
    if (!CASH.autoFwdData) CASH.autoFwdData = { active: false, messageId: null, chatId: null, intervalMins: 120, lastRun: 0 };
    const ui = getModernBroadcastText(CASH.autoForward, CASH.autoFwdData);
    ctx.editMessageText(ui.text, { parse_mode: "Markdown", ...ui.kbd }).catch(()=>{});
});

bot.action("toggle_autofwd2", async (ctx) => {
    if (!CASH.autoFwdData) CASH.autoFwdData = { active: false, messageIds: [], chatId: null, intervalMins: 120, currentIndex: 0, lastRun: 0 };
    if (!CASH.autoFwdData.messageIds) CASH.autoFwdData.messageIds = [];
    
    if (!CASH.autoFwdData.active && CASH.autoFwdData.messageIds.length === 0) {
        return ctx.answerCbQuery("⚠️ Sila set mesej dahulu! Reply pada mesej & taip /setautofwd2hr <minit>", { show_alert: true }).catch(()=>{});
    }
    await ctx.answerCbQuery().catch(() => { });
    
    CASH.autoFwdData.active = !CASH.autoFwdData.active;
    await saveConfig("autoFwdData", CASH.autoFwdData);
    
    if (!CASH.autoForward) CASH.autoForward = { messageIds: [], chatId: null, isActive: false };
    const ui = getModernBroadcastText(CASH.autoForward, CASH.autoFwdData);
    ctx.editMessageText(ui.text, { parse_mode: "Markdown", ...ui.kbd }).catch(()=>{});
});

bot.action("toggle_af2_time", async (ctx) => {
    if (!CASH.autoFwdData) CASH.autoFwdData = { active: false, messageId: null, chatId: null, intervalMins: 120, lastRun: 0 };
    
    const PRESETS = [2, 5, 10, 30, 60, 120, 180, 240, 360, 720]; // In minutes
    let currentMins = CASH.autoFwdData.intervalMins || 120;
    
    let nextIdx = PRESETS.indexOf(currentMins) + 1;
    if (nextIdx >= PRESETS.length) nextIdx = 0;
    
    CASH.autoFwdData.intervalMins = PRESETS[nextIdx];
    const intervalTxt = CASH.autoFwdData.intervalMins >= 60 ? `${CASH.autoFwdData.intervalMins/60} Jam` : `${CASH.autoFwdData.intervalMins} Minit`;
    
    await ctx.answerCbQuery(`✅ Masa kustom ditukar ke ${intervalTxt}!`).catch(() => { });
    
    saveConfig("autoFwdData", CASH.autoFwdData).catch(()=>{});
    
    if (!CASH.autoForward) CASH.autoForward = { messageIds: [], chatId: null, isActive: false };
    const ui = getModernBroadcastText(CASH.autoForward, CASH.autoFwdData);
    ctx.editMessageText(ui.text, { parse_mode: "Markdown", ...ui.kbd }).catch(()=>{});
});

// Admin & Ban Logic
bot.action("manage_admin", async (ctx) => {
    await ctx.answerCbQuery().catch(() => { });
    await ctx.editMessageText(`👮 **URUS ADMIN & GROUP**\n👤 Jumlah Admin: ${CASH.admins.length}\n📢 Forwarder Sah: ${CASH.forwardAdmins.length}\n👥 Group Manual: ${CASH.targetGroups.length}\n🤖 Group Auto-Fwd: ${(CASH.autoForwardGroups || []).length}`, Markup.inlineKeyboard([
        [Markup.button.callback("➕ Tambah Admin", "do_add_admin"), Markup.button.callback("➖ Buang Admin", "do_del_admin")],
        [Markup.button.callback("➕ Tambah Forwarder", "do_add_fwd_admin"), Markup.button.callback("➖ Buang Forwarder", "do_del_fwd_admin")],
        [Markup.button.callback("➕ Group Manual", "do_add_group"), Markup.button.callback("➖ Group Manual", "do_del_group")],
        [Markup.button.callback("➕ Group Auto-Fwd", "do_add_af_group"), Markup.button.callback("➖ Group Auto-Fwd", "do_del_af_group")],
        [Markup.button.callback("🔙 Kembali", "back_home")]
    ]));
});

bot.action("do_add_af_group", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); ctx.reply("Sila taip ID Group Khas untuk Auto-Forward:"); adminState[ctx.from.id] = { action: "WAIT_ADD_AF_GROUP" }; });
bot.action("do_del_af_group", async (ctx) => {
    if (!CASH.autoForwardGroups || CASH.autoForwardGroups.length === 0) return ctx.answerCbQuery("⚠️ Tiada group Auto-Forward.", { show_alert: true }).catch(()=>{});
    await ctx.answerCbQuery().catch(() => { });
    const buttons = CASH.autoForwardGroups.map((id, i) => [Markup.button.callback(`🗑 ${id}`, `rm_af_group_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Group Auto-Forward untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_af_group_idx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Group Auto-Fwd dipadam!").catch(()=>{});
    const idx = parseInt(ctx.match[1]);
    CASH.autoForwardGroups.splice(idx, 1);
    await saveConfig("autoForwardGroups", CASH.autoForwardGroups).catch(()=>{});
    ctx.editMessageText("Group Auto-Forward berjaya dipadam.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "manage_admin")]]));
});
bot.action("do_add_admin", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); adminState[ctx.from.id] = { action: "WAIT_ADD_ADMIN" }; ctx.reply("Sila taip ID User:"); });
bot.action("do_del_admin", async (ctx) => {
    if (CASH.admins.length === 0) return ctx.answerCbQuery("⚠️ Tiada admin.", { show_alert: true }).catch(()=>{});
    await ctx.answerCbQuery().catch(() => { });
    const buttons = CASH.admins.map((id, i) => [Markup.button.callback(`🗑 ${id}`, `rm_admin_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Admin untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_admin_idx_(\d+)$/, async (ctx) => {
    const idx = parseInt(ctx.match[1]);
    const id = CASH.admins[idx];
    if (id === CASH.SUPER_ADMIN_ID || (CASH.SUPER_ADMIN_IDS && CASH.SUPER_ADMIN_IDS.includes(id))) {
        await ctx.answerCbQuery("❌ Super Admin tidak boleh dipadam!", { show_alert: true }).catch(() => { });
        return;
    }
    await ctx.answerCbQuery("✅ Admin dipadam!").catch(() => { });
    CASH.admins.splice(idx, 1);
    await saveConfig("admins", CASH.admins).catch(() => { });
    ctx.editMessageText("Admin berjaya dipadam. Klik Kembali.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "manage_admin")]]));
});

bot.action("do_add_fwd_admin", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); adminState[ctx.from.id] = { action: "WAIT_ADD_FWD" }; ctx.reply("Sila taip ID User (Forwarder):"); });
bot.action("do_del_fwd_admin", async (ctx) => {
    if (CASH.forwardAdmins.length === 0) return ctx.answerCbQuery("⚠️ Tiada forwarder.", { show_alert: true }).catch(()=>{});
    await ctx.answerCbQuery().catch(() => { });
    const buttons = CASH.forwardAdmins.map((id, i) => [Markup.button.callback(`🗑 ${id}`, `rm_fwd_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Forwarder untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_fwd_idx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Forwarder dipadam!").catch(() => { });
    const idx = parseInt(ctx.match[1]);
    CASH.forwardAdmins.splice(idx, 1);
    await saveConfig("forwardAdmins", CASH.forwardAdmins).catch(() => { });
    ctx.editMessageText("Forwarder berjaya dipadam.", Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "manage_admin")]]));
});

bot.action("do_add_group", async (ctx) => { await ctx.answerCbQuery().catch(() => { }); ctx.reply("Sila taip ID Group:"); adminState[ctx.from.id] = { action: "WAIT_ADD_GROUP" }; });
bot.action("do_del_group", async (ctx) => {
    if (CASH.targetGroups.length === 0) return ctx.answerCbQuery("⚠️ Tiada group.", { show_alert: true }).catch(()=>{});
    await ctx.answerCbQuery().catch(() => { });
    const buttons = CASH.targetGroups.map((id, i) => [Markup.button.callback(`🗑 ${id}`, `rm_group_idx_${i}`)]);
    buttons.push([Markup.button.callback("🔙 Batal", "manage_admin")]);
    await ctx.editMessageText("Pilih Group untuk dipadam:", Markup.inlineKeyboard(buttons));
});
bot.action(/^rm_group_idx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery("✅ Group dipadam!").catch(() => { });
    const idx = parseInt(ctx.match[1]);
    CASH.targetGroups.splice(idx, 1);
    await saveConfig("targetGroups", CASH.targetGroups).catch(() => { });
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
    if (!CASH.bannedWords || CASH.bannedWords.length === 0) return ctx.answerCbQuery("⚠️ Senarai masih kosong.", { show_alert: true }).catch(()=>{});
    await ctx.answerCbQuery().catch(() => { });

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
    const removed = CASH.bannedWords[idx];
    await ctx.answerCbQuery(removed ? `✅ Dipadam: ${removed}` : "⚠️ Tidak dijumpai.").catch(() => { });
    if (removed !== undefined) {
        CASH.bannedWords.splice(idx, 1);
        await saveConfig("bannedWords", CASH.bannedWords).catch(() => { });
    }
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

    const isTargetGroup = CASH.targetGroups.includes(ctx.chat.id);
    const isSourceGroup = ctx.chat.id === CASH.SOURCE_CHAT_ID || (CASH.SOURCE_CHAT_IDS && CASH.SOURCE_CHAT_IDS.includes(ctx.chat.id));
    if (!isTargetGroup && !isSourceGroup) return;

    if (!ctx.from || ctx.from.is_bot || isAdmin(ctx.from.id) || ctx.from.id === 1087968824) return;

    const msg = ctx.message;
    const allowedForwards = [CASH.CHANNEL_ID, CASH.SOURCE_CHAT_ID, ...(CASH.SOURCE_CHAT_IDS || [])];
    if (msg.forward_from_chat && allowedForwards.includes(msg.forward_from_chat.id)) return;
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

    for (const kw in CASH.autoReplies) {
        if (text.includes(kw.toLowerCase())) {
            try {
                const m = await ctx.reply(CASH.autoReplies[kw]);
                setTimeout(() => ctx.telegram.deleteMessage(ctx.chat.id, m.message_id).catch(() => { }), 30000);
                await ctx.reply("BACK TO MENU TEKAN /start").catch(() => { });
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

bot.command("setautofwd", async (ctx) => {
    const userId = ctx.from.id;
    
    // Padam command supaya tak nampak di group public/source
    ctx.deleteMessage().catch(() => {});

    if (!isAdmin(userId)) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Akses Ditolak (Bukan Admin)**\nUser: ${ctx.from.first_name} (\`${userId}\`) cuba menggunakan \`/setautofwd\` di group \`${ctx.chat.title}\` (ID: ${ctx.chat.id}).`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    const isAllowedSource = ctx.chat.id === CASH.SOURCE_CHAT_ID || (CASH.SOURCE_CHAT_IDS && CASH.SOURCE_CHAT_IDS.includes(ctx.chat.id));
    if (!isAllowedSource) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Source Group**\nUser: ${ctx.from.first_name} (\`${userId}\`) cuba menggunakan \`/setautofwd\` di group yang tidak didaftarkan sebagai Source Group (\`${ctx.chat.title}\`, ID: ${ctx.chat.id}).`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    if (!ctx.message.reply_to_message) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Set Auto-Forward**\nUser: ${ctx.from.first_name} (\`${userId}\`) tidak membuat reply pada mesej semasa menaip \`/setautofwd\`.`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    if (!CASH.autoForward) CASH.autoForward = { messageIds: [], chatId: null, isActive: false, currentIndex: 0 };
    if (!CASH.autoForward.messageIds) CASH.autoForward.messageIds = [];

    if (CASH.autoForward.messageIds.length >= MAX_QUEUE_LIMIT) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Set Auto-Forward**\nSenarai Auto-Forward Round-Robin sudah penuh! Maksimum ${MAX_QUEUE_LIMIT} mesej dibenarkan.`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    CASH.autoForward.messageIds.push(ctx.message.reply_to_message.message_id);
    CASH.autoForward.chatId = ctx.chat.id; // Simpan chat ID di mana command dijalankan!
    CASH.autoForward.isActive = true; // Auto ON
    CASH.autoForward.lastRun = Date.now(); // Reset masa
    
    await saveConfig("autoForward", CASH.autoForward);
    startAutoForwardTimer();

    // Hantar log kejayaan
    bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `✅ **Mesej ditambah ke senarai Auto-Forward Round-Robin!** (Oleh ${ctx.from.first_name})\nJumlah semasa: ${CASH.autoForward.messageIds.length}/${MAX_QUEUE_LIMIT} mesej.\n\nBot akan forward dari Source Group (label betul).\n\n_(Nota: Gunakan /clearautofwd untuk padam senarai ini)_`, { parse_mode: "Markdown" }).catch(()=>{});
});

bot.command("clearautofwd", async (ctx) => {
    const userId = ctx.from.id;
    
    // Padam command
    ctx.deleteMessage().catch(() => {});

    if (!isAdmin(userId)) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Akses Ditolak (Bukan Admin)**\nUser: ${ctx.from.first_name} (\`${userId}\`) cuba menggunakan \`/clearautofwd\` di group \`${ctx.chat.title}\` (ID: ${ctx.chat.id}).`, { parse_mode: "Markdown" }).catch(()=>{});
    }
    
    if (CASH.autoForward) {
        CASH.autoForward.messageIds = [];
        CASH.autoForward.isActive = false;
        CASH.autoForward.currentIndex = 0;
        await saveConfig("autoForward", CASH.autoForward);
    }
    bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `✅ Senarai mesej Auto-Forward telah dikosongkan dan dimatikan oleh ${ctx.from.first_name}.`).catch(()=>{});
});

bot.command("setautofwd2hr", async (ctx) => {
    const userId = ctx.from.id;
    
    // Padam command
    ctx.deleteMessage().catch(() => {});

    if (!isAdmin(userId) && !isForwarder(userId)) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Akses Ditolak (Bukan Admin/Forwarder)**\nUser: ${ctx.from.first_name} (\`${userId}\`) cuba menggunakan \`/setautofwd2hr\` di group \`${ctx.chat.title}\` (ID: ${ctx.chat.id}).`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    const isAllowedSource = ctx.chat.id === CASH.SOURCE_CHAT_ID || (CASH.SOURCE_CHAT_IDS && CASH.SOURCE_CHAT_IDS.includes(ctx.chat.id));
    if (!isAllowedSource) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Source Group**\nUser: ${ctx.from.first_name} (\`${userId}\`) cuba menggunakan \`/setautofwd2hr\` di group yang tidak didaftarkan sebagai Source Group (\`${ctx.chat.title}\`, ID: ${ctx.chat.id}).`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    if (!ctx.message.reply_to_message) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Set Auto-Forward Kustom**\nUser: ${ctx.from.first_name} (\`${userId}\`) tidak membuat reply pada mesej semasa menaip \`/setautofwd2hr\`.`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    const args = (ctx.message.text || "").split(" ").slice(1);
    let intervalMins = 120; // Default 2 jam (120 minit)

    if (args.length > 0) {
        const parsed = parseInt(args[0]);
        if (!isNaN(parsed) && parsed > 0) {
            intervalMins = parsed;
        } else {
            return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Minit**\nUser: ${ctx.from.first_name} (\`${userId}\`) memasukkan nilai minit tidak sah: \`${args[0]}\`.`, { parse_mode: "Markdown" }).catch(()=>{});
        }
    }

    if (!CASH.autoFwdData) CASH.autoFwdData = { active: false, messageIds: [], chatId: null, intervalMins: 120, currentIndex: 0, lastRun: 0 };
    if (!CASH.autoFwdData.messageIds) CASH.autoFwdData.messageIds = [];

    if (CASH.autoFwdData.messageIds.length >= MAX_QUEUE_LIMIT) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **Ralat Set Auto-Forward Kustom**\nSenarai Kustom Auto-Forward sudah penuh! (${CASH.autoFwdData.messageIds.length}/${MAX_QUEUE_LIMIT})`, { parse_mode: "Markdown" }).catch(()=>{});
    }

    CASH.autoFwdData.messageIds.push(ctx.message.reply_to_message.message_id);
    CASH.autoFwdData.chatId = ctx.chat.id; // Simpan chat ID di mana command dijalankan!
    CASH.autoFwdData.intervalMins = intervalMins;
    CASH.autoFwdData.active = true;
    if (CASH.autoFwdData.lastRun === undefined) CASH.autoFwdData.lastRun = 0;
    if (CASH.autoFwdData.currentIndex === undefined) CASH.autoFwdData.currentIndex = 0;
    await saveConfig("autoFwdData", CASH.autoFwdData);

    const hours = (intervalMins / 60).toFixed(1);
    bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `✅ **MESEJ DITAMBAH KE QUEUE KUSTOM!** (Oleh ${ctx.from.first_name})\n\n📦 Queue: ${CASH.autoFwdData.messageIds.length}/${MAX_QUEUE_LIMIT} mesej\n⏱ Interval: ${intervalMins} minit (~${hours} jam)\n\nGunakan /clearautofwd2hr untuk reset queue.`, { parse_mode: "Markdown" }).catch(()=>{});
});

bot.command("clearautofwd2hr", async (ctx) => {
    if (!isAdmin(ctx.from.id) && !isForwarder(ctx.from.id)) return;
    ctx.deleteMessage().catch(() => {});

    if (CASH.autoFwdData) {
        CASH.autoFwdData.messageIds = [];
        CASH.autoFwdData.active = false;
        CASH.autoFwdData.currentIndex = 0;
        await saveConfig("autoFwdData", CASH.autoFwdData);
    }
    bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `✅ Queue Kustom Auto-Forward dikosongkan & dimatikan oleh ${ctx.from.first_name}.`).catch(()=>{});
});

bot.command("stopautofwd2hr", async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || "Unknown";
    if (!isAdmin(userId) && !isForwarder(userId)) return;

    ctx.deleteMessage().catch(() => {});

    if (CASH.autoFwdData) {
        CASH.autoFwdData.active = false;
        await saveConfig("autoFwdData", CASH.autoFwdData);
    }

    const logText = `⛔ **AUTO-FORWARD DIHENTIKAN**\n\n👤 Oleh: ${userName} (\`${userId}\`)\n⏰ Masa: ${new Date().toLocaleString("ms-MY")}\n\n_Auto-Forward Kustom telah dimatikan._`;
    await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, logText, { parse_mode: "Markdown" }).catch(() => {});
});

bot.command("forward", async (ctx) => {
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || "Unknown";

    await ctx.deleteMessage().catch(() => { });
    await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `🔍 **DEBUG**: /forward dipanggil oleh ${userName} (\`${userId}\`) di Chat: \`${ctx.chat.id}\``, { parse_mode: "Markdown" }).catch(() => { });

    if (!isForwarder(userId)) {
        const logText = `❌ **FAILED FORWARD**\nUser: ${userName} (\`${userId}\`)\nReason: Tiada akses Forwarder.`;
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, logText, { parse_mode: "Markdown" }).catch(() => { });
    }

    if (!ctx.message.reply_to_message) {
        const logText = `⚠️ **FAILED FORWARD**\nUser: ${userName} (\`${userId}\`)\nReason: Tidak reply pada mesej.`;
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, logText, { parse_mode: "Markdown" }).catch(() => { });
    }

    const r = ctx.message.reply_to_message;

    let groupTargets = [...CASH.targetGroups];
    let subscriberTargets = [];
    if (CASH.toggles.broadcastToSubs) {
        try {
            if (subscribersColl) {
                const subs = await subscribersColl.find({}).toArray();
                subscriberTargets = subs.map(s => s.userId);
            }
        } catch (e) {
            console.error("DB Fetch Error:", e);
            await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **DB FETCH ERROR**: Gagal ambil data subscriber.`).catch(() => { });
        }
    }

    let targets = [...groupTargets, ...subscriberTargets];
    const uniqueTargets = [...new Set(targets)].filter(id => id && id !== ctx.chat.id);

    await bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `🎯 **SASARAN DIJUMPAI**: ${uniqueTargets.length} destinasi.\n(Group/Channel: ${groupTargets.length}, Subs: ${subscriberTargets.length})`).catch(() => { });

    if (uniqueTargets.length === 0) {
        return bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ **FAILED FORWARD**\nReason: Tiada sasaran (sasaran 0). Sila pastikan anda telah menambah Group Target.`).catch(() => { });
    }

    LAST_BROADCAST = [];
    let count = 0;
    let failMessages = [];

    for (const t of uniqueTargets) {
        try {
            const s = await bot.telegram.forwardMessage(t, ctx.chat.id, r.message_id);
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
    if (textSnapshot.startsWith("/")) return next();

    const userId = ctx.from.id;
    const isPrivate = ctx.chat.type === "private";
    const text = textSnapshot;

    if (isAdmin(userId) && adminState[userId]) {
        const state = adminState[userId];
        if (text && ["batal", "/cancel"].includes(text.toLowerCase())) { delete adminState[userId]; return ctx.reply("🚫 Tindakan dibatalkan.", Markup.removeKeyboard()); }

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
        if (state.action === "WAIT_ADD_AF_GROUP") {
            const id = parseInt(text);
            if (isNaN(id)) { await ctx.reply("❌ ID Group tidak sah. Sila masukkan nombor (Cth: -100xxx)."); }
            else if (CASH.autoForwardGroups && CASH.autoForwardGroups.includes(id)) { await ctx.reply("⚠️ Group ini sudah ada dalam senarai Auto-Forward."); }
            else { 
                if (!CASH.autoForwardGroups) CASH.autoForwardGroups = [];
                CASH.autoForwardGroups.push(id); 
                await saveConfig("autoForwardGroups", CASH.autoForwardGroups); 
                await ctx.reply("✅ Group Auto-Forward berjaya ditambah."); 
            }
            delete adminState[userId]; return;
        }
        if (state.action === "WAIT_ADD_BAN") {
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

        if (state.action === "WAIT_ADD_TITLE_LINE") {
            const current = CASH.menuTitle ? CASH.menuTitle + "\n" : "";
            CASH.menuTitle = current + text;
            await saveConfig("menuTitle", CASH.menuTitle);
            delete adminState[userId];
            return ctx.reply("🎉 Baris berjaya ditambah! Tekan /panel untuk urus lagi.");
        }

        if (state.action === "WAIT_ADD_SUPER_ADMIN") {
            const id = parseInt(text);
            if (isNaN(id)) { return ctx.reply("❌ ID tidak sah. Sila masukkan nombor sahaja."); }
            
            if (!CASH.SUPER_ADMIN_IDS) CASH.SUPER_ADMIN_IDS = [CASH.SUPER_ADMIN_ID];
            
            if (CASH.SUPER_ADMIN_IDS.includes(id)) { 
                await ctx.reply("⚠️ ID ini sudah sedia menjadi Super Admin."); 
            } else { 
                CASH.SUPER_ADMIN_IDS.push(id); 
                await saveConfig("SUPER_ADMIN_IDS", CASH.SUPER_ADMIN_IDS); 
                
                // Pastikan ia juga masuk ke CASH.admins
                if (!CASH.admins.includes(id)) {
                    CASH.admins.push(id);
                    await saveConfig("admins", CASH.admins);
                }
                
                await ctx.reply(`✅ ID <code>${id}</code> berjaya didaftarkan sebagai Super Admin baru.`, { parse_mode: "HTML" }); 
            }
            delete adminState[userId]; return;
        }

        if (state.action === "WAIT_ADD_SOURCE_GROUP") {
            const id = parseInt(text);
            if (isNaN(id)) { return ctx.reply("❌ ID tidak sah. Sila masukkan nombor sahaja (Cth: -100xxx)."); }
            
            if (!CASH.SOURCE_CHAT_IDS) CASH.SOURCE_CHAT_IDS = [CASH.SOURCE_CHAT_ID];
            
            if (CASH.SOURCE_CHAT_IDS.includes(id)) { 
                await ctx.reply("⚠️ ID ini sudah sedia menjadi Source Group."); 
            } else { 
                CASH.SOURCE_CHAT_IDS.push(id); 
                await saveConfig("SOURCE_CHAT_IDS", CASH.SOURCE_CHAT_IDS); 
                await ctx.reply(`✅ ID <code>${id}</code> berjaya didaftarkan sebagai Source Group baru.`, { parse_mode: "HTML" }); 
            }
            delete adminState[userId]; return;
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

        if (state.action === "WAIT_WELCOME_MSG") {
            CASH.welcomeMessage = text;
            await saveConfig("welcomeMessage", text);
            delete adminState[userId];
            return ctx.reply("✅ **MESEJ WELCOME DISIMPAN!**\n\nPratonton:\n" + text.replace(/%NAME%/g, ctx.from.first_name), { parse_mode: "Markdown" });
        }
    }

    if ((ctx.chat.id === CASH.LOG_GROUP_ID || ctx.chat.id === CASH.SOURCE_CHAT_ID) && ctx.message.reply_to_message && isAdmin(userId)) {
        const targetId = ctx.message.reply_to_message.forward_from ? ctx.message.reply_to_message.forward_from.id : null;

        if (targetId) {
            try {
                await bot.telegram.copyMessage(targetId, ctx.chat.id, ctx.message.message_id);
                await ctx.reply("✅ Pesan terkirim ke User!");
            } catch (e) {
                await ctx.reply("❌ Gagal kirim: User mungkin block bot.");
            }
        }
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
                await ctx.reply(d.caption, { ...btn });
            }
            return;
        }
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

// CRON JOB ROUTE - Khas untuk trigger dari luar (Bypass server sleep)
app.get("/cron/autoforward", async (req, res) => {
    if (!CASH.autoForward || !CASH.autoForward.isActive) {
        return res.status(200).send("Auto-Forward is OFF.");
    }
    const { messageIds, chatId } = CASH.autoForward;
    const uniqueTargets = [...new Set(CASH.autoForwardGroups || [])];
    
    if (uniqueTargets.length === 0 || !messageIds || messageIds.length === 0) {
        return res.status(200).send("No target groups or messages set.");
    }
    
    // Round-Robin Logic
    let cIndex = CASH.autoForward.currentIndex || 0;
    if (cIndex >= messageIds.length) cIndex = 0;
    const mId = messageIds[cIndex];
    
    let count = 0;
    for (const t of uniqueTargets) {
        try {
            await bot.telegram.forwardMessage(t, chatId || CASH.SOURCE_CHAT_ID, mId);
            count++;
            await new Promise(r => setTimeout(r, 500)); // Delay sikit
        } catch (e) {
            console.log(`Cron Auto-Forward Error to ${t}: ${e.message}`);
        }
    }
    
    CASH.autoForward.currentIndex = (cIndex + 1) % messageIds.length;
    CASH.autoForward.lastRun = Date.now();
    saveConfig("autoForward", CASH.autoForward).catch(()=>{});
    
    if (count > 0 && CASH.stats) {
        CASH.stats.totalForwards += count;
        saveConfig("stats", CASH.stats).catch(()=>{});
    }
    res.status(200).send(`Cron triggered! Forwarded 1 message (Index: ${cIndex}) to ${count} groups.`);
});

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server HTTP Running on Port: ${PORT}`);
    startServices();
});

async function startServices() {
    console.log("🔄 [STARTUP] Memulakan perkhidmatan...");

    // Step 1: Sambung MongoDB & load config DULU sebelum bot start
    console.log("🔄 [DB] Menghubungi MongoDB...");
    try {
        await connectMongo();
        console.log("✅ [DB] MongoDB Berjaya Disambungkan & Config Loaded.");
    } catch (err) {
        console.error("⚠️ [DB] MongoDB Gagal disambung (Bot guna config default):", err.message);
    }

    // Step 2: Baru launch bot polling
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

    startAutoForwardLoop();
    startKeepAlive();
}

// --- AUTO FORWARD 2 HOURS LOOP ---
let autoFwdTimer = null;
function startAutoForwardLoop() {
    if (autoFwdTimer) clearInterval(autoFwdTimer);
    autoFwdTimer = setInterval(async () => {
        if (!CASH.autoFwdData || !CASH.autoFwdData.active) return;
        if (!CASH.autoFwdData.messageIds || CASH.autoFwdData.messageIds.length === 0) return;

        const now = Date.now();
        const lastRun = CASH.autoFwdData.lastRun || 0;
        const intervalMins = CASH.autoFwdData.intervalMins || 120;
        const TARGET_MS = intervalMins * 60 * 1000;

        if (now - lastRun >= TARGET_MS) {
            CASH.autoFwdData.lastRun = now;
            CASH.autoFwdData.lastWarning = 0; // Reset warning untuk cycle seterusnya
            await saveConfig("autoFwdData", CASH.autoFwdData);

            let targetGroups = CASH.targetGroups || [];
            if (targetGroups.length === 0) {
                bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ *Auto-Forward Kustom Terhenti:* Tiada group sasaran didaftarkan di dalam Group Manual (/panel -> Urus Admin & Group -> Group Manual).`).catch(()=>{});
                return;
            }

            // Round-Robin untuk Kustom
            const messageIds = CASH.autoFwdData.messageIds || [];
            if (messageIds.length === 0) {
                bot.telegram.sendMessage(CASH.LOG_GROUP_ID, `⚠️ *Auto-Forward Kustom Terhenti:* Senarai mesej kustom kosong. Sila reply pada mesej dan taip /setautofwd2hr.`).catch(()=>{});
                return;
            }

            let cIndex = CASH.autoFwdData.currentIndex || 0;
            if (cIndex >= messageIds.length) cIndex = 0;
            const mId = messageIds[cIndex];

            // Sentiasa forward dari SOURCE_CHAT_ID/chatId supaya label "Forwarded from" betul
            const sourceChatId = CASH.autoFwdData.chatId || CASH.SOURCE_CHAT_ID;
            console.log(`⏳ [AUTO-FWD-KUSTOM] Executing msg index ${cIndex + 1}/${messageIds.length} (Interval: ${intervalMins}m)...`);
            let count = 0;
            for (const t of targetGroups) {
                try {
                    await bot.telegram.forwardMessage(t, sourceChatId, mId);
                    count++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    console.log(`Auto-Forward Kustom Error to ${t}: ${e.message}`);
                }
            }

            // Update index untuk next cycle
            CASH.autoFwdData.currentIndex = (cIndex + 1) % messageIds.length;
            await saveConfig("autoFwdData", CASH.autoFwdData);
            console.log(`✅ [AUTO-FWD-KUSTOM] Successfully forwarded to ${count} groups.`);

            // Log ke group selepas forward
            const nextTxt = intervalMins >= 60 ? `${(intervalMins/60).toFixed(1)} Jam` : `${intervalMins} Minit`;
            bot.telegram.sendMessage(
                CASH.LOG_GROUP_ID,
                `✅ *AUTO-FORWARD KUSTOM SELESAI*\n\n📦 Mesej Index: ${cIndex + 1}/${messageIds.length}\n🎯 Berjaya ke: ${count}/${targetGroups.length} Group\n⏰ Forward seterusnya dalam: ~${nextTxt}`,
                { parse_mode: "Markdown" }
            ).catch(()=>{});

        } else {
            // === PRE-WARNING: 5 minit sebelum forward ===
            const WARNING_MS = 5 * 60 * 1000; // 5 minit
            const timeRemaining = TARGET_MS - (now - lastRun);
            const lastWarning = CASH.autoFwdData.lastWarning || 0;

            if (timeRemaining <= WARNING_MS && timeRemaining > 0 && (now - lastWarning) > WARNING_MS) {
                CASH.autoFwdData.lastWarning = now;
                saveConfig("autoFwdData", CASH.autoFwdData).catch(()=>{});

                const minsLeft = Math.ceil(timeRemaining / 60000);
                const targetGroups = CASH.targetGroups || [];

                bot.telegram.sendMessage(
                    CASH.LOG_GROUP_ID,
                    `⏰ *AMARAN AUTO-FORWARD (KUSTOM)*\n\n🔔 Akan forward dalam lebih kurang *${minsLeft} minit*!\n🎯 Sasaran: ${targetGroups.length} Group\n⏱ Interval: ${intervalMins >= 60 ? `${(intervalMins/60).toFixed(1)} Jam` : `${intervalMins} Minit`}\n\n_Bersiap sedia..._`,
                    { parse_mode: "Markdown" }
                ).catch(()=>{});
            }
        }
    }, 60 * 1000); // Check setiap 1 minit
}

// --- KEEP ALIVE MECHANISM (PREVENT SLEEP) ---
function startKeepAlive() {
    setInterval(() => {
        http.get(`http://localhost:${PORT}`, (res) => {
            // Ping success (Silent)
        }).on('error', (err) => {
            console.error(`❌ Keep-Alive Ping Error: ${err.message}`);
        });
    }, 5 * 60 * 1000);
}

process.once('SIGINT', () => { bot.stop('SIGINT'); server.close(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); server.close(); });

