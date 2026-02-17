// bot_v2.js - Versi Upgrade (Dynamic Config, Anti-Spam Canggih, Feedback System)
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import express from "express";

dotenv.config();

// ================= KONFIGURASI UTAMA =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
// Admin Utama (Super Admin) - Tidak bisa dihapus lewat command
const SUPER_ADMIN_ID = 8146896736;
const PORT = parseInt(process.env.PORT || "8080", 10);
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

// Helper: Validasi URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Group Log & Broadcast Source
const LOG_GROUP_ID = -1003832228118;
const SOURCE_CHAT_ID = -1002626291566;
const CHANNEL_ID = -1003175423118;

const AUTO_DELETE_DELAY = 5000;
const SUB_BATCH_SIZE = 20;
const SUB_DELAY_BETWEEN_BATCH = 1000;

// ================= STATE & CACHE (Supaya Cepat) =================
// Kita simpan config di memori juga supaya tidak query DB setiap kali ada pesan masuk (berat).
// Cache akan di-update setiap kali ada perubahan via command.
const CASH = {
    bannedWords: [],
    targetGroups: [],
    admins: [SUPER_ADMIN_ID], // Minimal ada super admin
    whitelistGroups: [SOURCE_CHAT_ID, LOG_GROUP_ID], // Grup yang bot tidak akan hapus pesan
    menuData: {}, // Dynamic Main Menu
    linkMenuData: {} // Dynamic Link Menu
};

// ================= MONGODB SETUP =================
let mongoClient = null;
let db = null;
let subscribersColl = null;
let configColl = null;
let warningsColl = null;

async function connectMongo() {
    if (!MONGODB_URI) {
        console.error("❌ MONGODB_URI kosong!");
        return false;
    }
    try {
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db("botdb");

        subscribersColl = db.collection("subscribers");
        configColl = db.collection("configs");
        warningsColl = db.collection("warnings");

        // Indexing
        await subscribersColl.createIndex({ userId: 1 }, { unique: true });
        await configColl.createIndex({ key: 1 }, { unique: true });
        await warningsColl.createIndex({ userId: 1, chatId: 1 }); // Index compound untuk warning per user per grup

        console.log("✅ MongoDB Terhubung.");

        // Load Config Awal
        await loadConfig();

        return true;
    } catch (err) {
        console.error("❌ Gagal Konek MongoDB:", err.message);
        return false;
    }
}

async function loadConfig() {
    try {
        // 1. Banned Words
        const bans = await configColl.findOne({ key: "bannedWords" });
        if (bans && bans.value) CASH.bannedWords = bans.value;
        else {
            // Default words jika belum ada di DB
            const defaults = ["new register", "free kredit luar", "bonus 100%", "kencing", "anjing"];
            await configColl.updateOne({ key: "bannedWords" }, { $set: { value: defaults } }, { upsert: true });
            CASH.bannedWords = defaults;
        }

        // 2. Target Groups
        const groups = await configColl.findOne({ key: "targetGroups" });
        if (groups && groups.value) CASH.targetGroups = groups.value;
        else {
            // Default groups
            const defaults = [
                -1003443785953, -1003355430208, -1003303586267, -1003386119312,
                -1002174638632, -1002112370494, -1002199080095, -1001925377693,
                -1002153443910, -1003418215358, -1003410432304, -1003390131591,
                -1003379058057
            ];
            await configColl.updateOne({ key: "targetGroups" }, { $set: { value: defaults } }, { upsert: true });
            CASH.targetGroups = defaults;
        }

        // 3. Admins
        const admins = await configColl.findOne({ key: "admins" });
        if (admins && admins.value) {
            // Gabung Super Admin + Admin DB
            CASH.admins = [...new Set([SUPER_ADMIN_ID, ...admins.value])];
        } else {
            await configColl.updateOne({ key: "admins" }, { $set: { value: [] } }, { upsert: true });
            CASH.admins = [SUPER_ADMIN_ID];
        }

        // 4. Menu Data (NEW)
        const menu = await configColl.findOne({ key: "menuData" });
        if (menu && menu.value) CASH.menuData = menu.value;
        else {
            // Default Menu Data
            const defaults = {
                "🌟 NEW REGISTER FREE 🌟": {
                    url: "https://afb88.hfcapital.top/",
                    media: "https://ibb.co/BK2LVQ6t",
                    caption: `🌟 NEW REGISTER BONUS AFB88 🌟\n⚠️ Langgar syarat, semua point akan FORFEIT ⚠️\n✅ Keperluan SLOT SAHAJA\n✅ Free Credit R188\n✅ Min WD/Cuci RM 6600\n✅ Max Payment/WD RM20\n✅ Dibenarkan main AFB GAMING (EVENT GAME SAHAJA)\n✅ Dibenarkan main MEGAH5 | EPICWIN | PXPLAY2 | ACEWIN2 | RICH GAMING (EVENT GAME SAHAJA)\n✅ Sila download apps untuk claim\n📎 LINK: https://afb88.hfcapital.top/\n\n⚠️ 1 nama 1 ID sahaja\n⚠️ Nama daftar mesti sama dengan nama akaun bank\n\n➤ CLICK /start BACK TO MENU`
                },
                "📘 SHARE FACEBOOK 📘": {
                    url: "https://afb88my1.com/promotion",
                    media: "https://ibb.co/Z6B55VcX",
                    caption: `📘 PROMO SHARE FACEBOOK 📘\n🧧 Free Credit RM68 🧧\n\nSyarat:\n✅ Join Telegram Channel\n✅ Join Facebook Group\n➡️ Share ke 5 group casino\n➡️ Daily claim 1x sehari\n\n➤ CLICK /start BACK TO MENU`
                },
                "🔥 DAILY APPS FREE 🔥": {
                    url: "https://afb88my1.com/promotion",
                    media: "https://ibb.co/nsmVQFbg",
                    caption: `🔥 DAILY APPS FREE 🔥\n🎁 Free Credit RM20\n📌 Daily claim 1x\n💰 Min WD RM600\n\n➤ CLICK /start BACK TO MENU`
                },
                "🌞 SOCIAL MEDIA 🌞": {
                    url: "https://afb88my1.com/promotion",
                    media: "https://ibb.co/HfyD6DWw",
                    caption: `🌞 SOCIAL MEDIA OFFICIAL AFB88 🌞\n📘 Facebook\n📸 Instagram\n🎥 WhatsApp Group\n\n➤ CLICK /start BACK TO MENU`
                },
                "🎉 TELEGRAM BONUS 🎉": {
                    url: "https://afb88my1.com/promotion",
                    media: "https://ibb.co/21qTqmtY",
                    caption: `🎉 TELEGRAM BONUS KHAS 🎉\n🎁 Free Credit RM30\n✅ Claim 1x\n\n➤ CLICK /start BACK TO MENU`
                }
            };
            await configColl.updateOne({ key: "menuData" }, { $set: { value: defaults } }, { upsert: true });
            CASH.menuData = defaults;
        }

        // 5. Link Menu Data (NEW)
        const linkMenu = await configColl.findOne({ key: "linkMenuData" });
        if (linkMenu && linkMenu.value) CASH.linkMenuData = linkMenu.value;
        else {
            const defaults = {
                "📢 CHANNEL UTAMA": { url: "https://t.me/afb88my", label: "📢 BUKA CHANNEL" },
                "💬 GROUP CUCI & TIPS": { url: "https://t.me/+b685QE242dMxOWE9", label: "💬 BUKA GROUP" },
                "🌐 REGISTER & LOGIN": { url: "https://afb88my1.com/", label: "🌐 BUKA LAMAN" },
                "🎁 GROUP HADIAH AFB88": { url: "https://t.me/Xamoi2688", label: "🎁 BUKA GROUP" }
            };
            await configColl.updateOne({ key: "linkMenuData" }, { $set: { value: defaults } }, { upsert: true });
            CASH.linkMenuData = defaults;
        }

        console.log("✅ Config Dimuat:",
            `\n- ${CASH.bannedWords.length} Banned Words`,
            `\n- ${CASH.targetGroups.length} Target Groups`,
            `\n- ${CASH.admins.length} Admins`,
            `\n- ${Object.keys(CASH.menuData).length} Menu Items`,
            `\n- ${Object.keys(CASH.linkMenuData).length} Link Items`
        );
    } catch (err) {
        console.error("Gagal load config:", err);
    }
}

// Helper: Save Config ke DB
async function saveConfig(key, value) {
    await configColl.updateOne({ key }, { $set: { value } }, { upsert: true });
}

// ================= INITIALIZE BOT =================
if (!BOT_TOKEN || BOT_TOKEN === "ISI_TOKEN_DI_SINI") {
    console.error("❌ BOT_TOKEN Masih Kosong!");
    process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// Middleware: Cek Admin
function isAdmin(userId) {
    return CASH.admins.includes(userId);
}

// ================= COMMANDS: MANAJEMEN CONFIG =================

// 1. Manage Banned Words
bot.command("addban", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const word = ctx.payload.toLowerCase().trim();
    if (!word) return ctx.reply("Format: /addban <kata>");

    if (!CASH.bannedWords.includes(word)) {
        CASH.bannedWords.push(word);
        await saveConfig("bannedWords", CASH.bannedWords);
        ctx.reply(`✅ Kata '${word}' ditambah ke blacklist.`);
    } else {
        ctx.reply("⚠️ Kata sudah ada.");
    }
});

bot.command("delban", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const word = ctx.payload.toLowerCase().trim();
    if (!word) return ctx.reply("Format: /delban <kata>");

    const initLen = CASH.bannedWords.length;
    CASH.bannedWords = CASH.bannedWords.filter(w => w !== word);

    if (CASH.bannedWords.length < initLen) {
        await saveConfig("bannedWords", CASH.bannedWords);
        ctx.reply(`✅ Kata '${word}' dihapus dari blacklist.`);
    } else {
        ctx.reply("⚠️ Kata tidak ditemukan.");
    }
});

bot.command("listban", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const list = CASH.bannedWords.map((w, i) => `${i + 1}. ${w}`).join("\n");
    ctx.reply(`🚫 **BANNED WORDS**\n\n${list || "Kosong"}`);
});

// 2. Manage Target Groups
bot.command("addgroup", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    // Bisa ambil ID dari payload atau ID grup saat ini
    let groupId = parseInt(ctx.payload) || ctx.chat.id;

    if (groupId > 0) return ctx.reply("⚠️ ID Grup biasanya minus (-). Gunakan '/addgroup' di dalam grup tujuannya.");

    if (!CASH.targetGroups.includes(groupId)) {
        CASH.targetGroups.push(groupId);
        await saveConfig("targetGroups", CASH.targetGroups);
        ctx.reply(`✅ Grup ID ${groupId} ditambah ke target broadcast.`);
    } else {
        ctx.reply("⚠️ Grup sudah ada di list.");
    }
});

bot.command("delgroup", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const groupId = parseInt(ctx.payload);
    if (!groupId) return ctx.reply("Format: /delgroup <id_grup>");

    const initLen = CASH.targetGroups.length;
    CASH.targetGroups = CASH.targetGroups.filter(id => id !== groupId);

    if (CASH.targetGroups.length < initLen) {
        await saveConfig("targetGroups", CASH.targetGroups);
        ctx.reply(`✅ Grup ${groupId} dihapus.`);
    } else {
        ctx.reply("⚠️ Grup tidak ditemukan.");
    }
});

bot.command("listgroup", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const list = CASH.targetGroups.map((id, i) => `${i + 1}. \`${id}\``).join("\n");
    ctx.reply(`📢 **TARGET GROUPS**\n\n${list || "Kosong"}`, { parse_mode: "Markdown" });
});

// 3. Manage Admins
bot.command("addadmin", async (ctx) => {
    if (ctx.from.id !== SUPER_ADMIN_ID) return ctx.reply("⛔ Hanya Super Admin.");
    const newAdminId = parseInt(ctx.payload);
    if (!newAdminId) return ctx.reply("Format: /addadmin <user_id>");

    if (!CASH.admins.includes(newAdminId)) {
        CASH.admins.push(newAdminId);
        // Kita simpan hanya 'extra' admin selain super admin
        const extraAdmins = CASH.admins.filter(id => id !== SUPER_ADMIN_ID);
        await saveConfig("admins", extraAdmins);
        ctx.reply(`✅ Admin ${newAdminId} ditambah.`);
    } else {
        ctx.reply("⚠️ Sudah admin.");
    }
});

bot.command("deladmin", async (ctx) => {
    if (ctx.from.id !== SUPER_ADMIN_ID) return ctx.reply("⛔ Hanya Super Admin.");
    const targetId = parseInt(ctx.payload);
    if (!targetId) return ctx.reply("Format: /deladmin <user_id>");
    if (targetId === SUPER_ADMIN_ID) return ctx.reply("❌ Tidak bisa hapus Super Admin.");

    const initLen = CASH.admins.length;
    CASH.admins = CASH.admins.filter(id => id !== targetId);

    if (CASH.admins.length < initLen) {
        const extraAdmins = CASH.admins.filter(id => id !== SUPER_ADMIN_ID);
        await saveConfig("admins", extraAdmins);
        ctx.reply(`✅ Admin ${targetId} dihapus.`);
    } else {
        ctx.reply("⚠️ ID tersebut bukan admin.");
    }
});

// 4. Manage Menus (Dynamic & Safe)
// /addmenu Button Text | Caption | ImageURL | ButtonLink
bot.command("addmenu", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.payload.split("|").map(s => s.trim());
    if (args.length < 4) return ctx.reply("❌ Format Salah!\nGuna: `/addmenu Button Text | Caption | ImageURL | ButtonLink`", { parse_mode: "Markdown" });

    const [btnText, caption, media, url] = args;

    // Validasi URL
    if (!isValidUrl(media)) return ctx.reply("❌ Error: Link Gambar (ImageURL) tak valid. Sila pastikan link bermula dengan http:// atau https://");
    if (!isValidUrl(url)) return ctx.reply("❌ Error: Link Tombol (ButtonLink) tak valid. Sila pastikan link bermula dengan http:// atau https://");

    CASH.menuData[btnText] = { caption, media, url };
    await saveConfig("menuData", CASH.menuData);
    ctx.reply(`✅ Menu '${btnText}' berjaya ditambah/update!`);
});

bot.command("delmenu", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const btnText = ctx.payload.trim();
    if (!btnText) return ctx.reply("❌ Format Salah! Guna: `/delmenu Button Text`", { parse_mode: "Markdown" });

    if (!CASH.menuData[btnText]) return ctx.reply("⚠️ Menu tak jumpa dalam database.");

    // Konfirmasi Hapus
    await ctx.reply(`⚠️ Adakah anda pasti nak hapus menu '${btnText}'?`, {
        ...Markup.inlineKeyboard([
            [Markup.button.callback("✅ YA, HAPUS", `confirm_delmenu_${btnText}`)],
            [Markup.button.callback("❌ BATAL", "cancel_action")]
        ])
    });
});

// Action Handler untuk Konfirmasi Hapus Menu
bot.action(/^confirm_delmenu_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔ Anda bukan admin!");
    const btnText = ctx.match[1];

    if (CASH.menuData[btnText]) {
        delete CASH.menuData[btnText];
        await saveConfig("menuData", CASH.menuData);
        await ctx.editMessageText(`✅ Menu '${btnText}' telah berjaya dihapus.`);
    } else {
        await ctx.editMessageText("⚠️ Menu sudah tiada (mungkin dah dihapus).");
    }
});

// /addlink Button Text | Label | URL
bot.command("addlink", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const args = ctx.payload.split("|").map(s => s.trim());
    if (args.length < 3) return ctx.reply("❌ Format Salah!\nGuna: `/addlink Button Text | Label | URL`", { parse_mode: "Markdown" });

    const [btnText, label, url] = args;

    if (!isValidUrl(url)) return ctx.reply("❌ Error: URL tak valid. Sila pastikan link bermula dengan http:// atau https://");

    CASH.linkMenuData[btnText] = { label, url };
    await saveConfig("linkMenuData", CASH.linkMenuData);
    ctx.reply(`✅ Link Menu '${btnText}' berjaya ditambah/update!`);
});

bot.command("dellink", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    const btnText = ctx.payload.trim();
    if (!btnText) return ctx.reply("❌ Format Salah! Guna: `/dellink Button Text`", { parse_mode: "Markdown" });

    if (!CASH.linkMenuData[btnText]) return ctx.reply("⚠️ Link Menu tak jumpa.");

    // Konfirmasi Hapus Link
    await ctx.reply(`⚠️ Adakah anda pasti nak hapus Link Menu '${btnText}'?`, {
        ...Markup.inlineKeyboard([
            [Markup.button.callback("✅ YA, HAPUS", `confirm_dellink_${btnText}`)],
            [Markup.button.callback("❌ BATAL", "cancel_action")]
        ])
    });
});

// Action Handler untuk Konfirmasi Hapus Link
bot.action(/^confirm_dellink_(.+)$/, async (ctx) => {
    if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔ Anda bukan admin!");
    const btnText = ctx.match[1];

    if (CASH.linkMenuData[btnText]) {
        delete CASH.linkMenuData[btnText];
        await saveConfig("linkMenuData", CASH.linkMenuData);
        await ctx.editMessageText(`✅ Link Menu '${btnText}' telah berjaya dihapus.`);
    } else {
        await ctx.editMessageText("⚠️ Link Menu sudah tiada.");
    }
});

// Action Batal Umum
bot.action("cancel_action", async (ctx) => {
    await ctx.deleteMessage();
    await ctx.reply("👌 Operasi dibatalkan.");
});


// ================= SISTEM MODERASI & WARNING =================
async function warnUser(ctx, userId, chatId, reason) {
    // Cek warning user ini di grup ini
    let warnData = await warningsColl.findOne({ userId, chatId });

    // Reset warning jika sudah lebih dari 24 jam
    if (warnData && (new Date() - warnData.lastWarned > 24 * 60 * 60 * 1000)) {
        warnData = null; // Reset
    }

    const currentCount = (warnData?.count || 0) + 1;

    // Update DB
    await warningsColl.updateOne(
        { userId, chatId },
        {
            $set: { count: currentCount, lastWarned: new Date() },
            $setOnInsert: { userId, chatId }
        },
        { upsert: true }
    );

    // Hapus pesan pelanggaran
    try { await ctx.deleteMessage(); } catch { }

    if (currentCount < 3) {
        // Warning 1 & 2
        const msg = await ctx.reply(
            `⚠️ **PERINGATAN ${currentCount}/3**\n` +
            `User: ${ctx.from.first_name}\n` +
            `Alasan: ${reason}\n\n` +
            `Jangan ulangi atau anda akan di-mute!`
            , { parse_mode: "Markdown" });

        // Hapus pesan warning setelah 10 detik
        setTimeout(() => ctx.telegram.deleteMessage(chatId, msg.message_id).catch(() => { }), 10000);

    } else {
        // Warning 3 -> MUTE
        try {
            await ctx.restrictChatMember(userId, {
                until_date: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 jam
                permissions: { can_send_messages: false }
            });

            await ctx.reply(
                `⛔ **USER MUTED**\n` +
                `User: ${ctx.from.first_name}\n` +
                `Status: Mencapai 3x Peringatan.\n` +
                `Sanksi: Tidak bisa kirim pesan selama 24 jam.`
            );

            // Reset count setelah mute
            await warningsColl.deleteOne({ userId, chatId });

        } catch (err) {
            console.error("Gagal mute user:", err.message);
            ctx.reply("⚠️ Gagal mute user (Mungkin saya bukan admin?).");
        }
    }
}

async function handleModeration(ctx) {
    if (!ctx.chat || (ctx.chat.type !== "group" && ctx.chat.type !== "supergroup")) return;
    if (!ctx.from || ctx.from.is_bot) return;
    if (isAdmin(ctx.from.id)) return; // Admin Bebas

    // Ignore whitelist channels/groups (Forward dari sini aman)
    const msg = ctx.message;
    if (msg.forward_from_chat && [CHANNEL_ID, SOURCE_CHAT_ID].includes(msg.forward_from_chat.id)) return;

    const text = (msg.text || msg.caption || "").toString();
    const textLower = text.toLowerCase();

    // 1. Cek Link
    const entities = msg.entities || msg.caption_entities || [];
    const hasLink = entities.some(e => e.type === "url" || e.type === "text_link") ||
        /https?:\/\/|www\.|t\.me\//i.test(text);

    if (hasLink) {
        return await warnUser(ctx, ctx.from.id, ctx.chat.id, "Mengirim Link Terlarang");
    }

    // 2. Cek Bad Words
    if (CASH.bannedWords.some(w => textLower.includes(w))) {
        return await warnUser(ctx, ctx.from.id, ctx.chat.id, "Kata-kata Terlarang");
    }
}


// ================= MENU & LOGIC LAMA (DIPERTAHANKAN) =================
// (Bagian ini sama dengan bot lama: /start, menu, broadcast)

async function addSubscriber(userId) {
    if (!subscribersColl) return false;
    try {
        const res = await subscribersColl.updateOne(
            { userId }, { $set: { userId, updatedAt: new Date() } }, { upsert: true }
        );
        return res.upsertedCount === 1;
    } catch { return false; }
}

async function sendStart(ctx) {
    const user = ctx.from || {};
    const username = user.username ? `@${user.username}` : user.first_name || "Bossku";

    // Auto Subscribe
    if (await addSubscriber(user.id)) {
        bot.telegram.sendMessage(LOG_GROUP_ID,
            `🎉 **NEW SUBSCRIBER**\nName: ${user.first_name}\nID: ${user.id}`).catch(() => { });
    }

    // Generate Dynamic Buttons
    // 1. Link Buttons (Inline)
    const linkButtons = [];
    const linkKeys = Object.keys(CASH.linkMenuData);
    for (let i = 0; i < linkKeys.length; i += 2) {
        const row = [];
        if (linkKeys[i]) {
            const data = CASH.linkMenuData[linkKeys[i]];
            row.push(Markup.button.url(data.label, data.url));
        }
        if (linkKeys[i + 1]) {
            const data = CASH.linkMenuData[linkKeys[i + 1]];
            row.push(Markup.button.url(data.label, data.url));
        }
        if (row.length > 0) linkButtons.push(row);
    }

    // 2. Menu Buttons (Keyboard)
    const menuKeys = Object.keys(CASH.menuData);
    // Split menu keys into rows (e.g., 2 per row if many, or 1 per row)
    // Here logic: just stack them or 1 per row for clarity? Original had 1 per row usually.
    const uniqueMenuKeys = [...new Set([...menuKeys, ...Object.keys(CASH.linkMenuData)])];
    const replyKeyboard = uniqueMenuKeys.map(k => [k]);

    await ctx.replyWithAnimation("https://media3.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif", {
        caption: `👋 Hi ${username} Bossku 😘\n\nKalau sudah join semua channel & group, amoi akan cuba bagi info paling untung untuk anda ❤️`,
        ...Markup.inlineKeyboard(linkButtons)
    });

    // Add default buttons if needed or just from DB
    if (replyKeyboard.length > 0) {
        await ctx.reply("➤ Tekan /start bila-bila masa untuk kembali ke menu utama.", Markup.keyboard(replyKeyboard).resize());
    }
}

bot.start(sendStart);
bot.command(["menu", "help"], sendStart);

// BROADCAST SYSTEM (Updated to use CASH.targetGroups)
let isBroadcastRunning = false;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

bot.command("forward", async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;
    if (ctx.chat.id !== SOURCE_CHAT_ID) return;
    if (!ctx.message.reply_to_message) return ctx.reply("⚠️ Reply pesan yang mau dibroadcast.");

    if (isBroadcastRunning) return ctx.reply("⚠️ Sedang broadcast...");
    isBroadcastRunning = true;
    ctx.reply("🚀 Broadcast dimulai...");

    const replyTo = ctx.message.reply_to_message;

    // 1. Ke Target Groups
    let sentGroups = 0;
    for (const gid of CASH.targetGroups) {
        if (gid === SOURCE_CHAT_ID) continue;
        try {
            await bot.telegram.forwardMessage(gid, replyTo.chat.id, replyTo.message_id);
            sentGroups++;
        } catch (e) {
            console.error(`Fail Group ${gid}: ${e.message}`);
        }
    }

    // 2. Ke Subscribers
    const subscribers = await subscribersColl.find({}, { projection: { userId: 1 } }).toArray();
    let sentSubs = 0;

    if (subscribers.length > 0) {
        ctx.reply(`📨 Mengirim ke ${subscribers.length} subscribers...`);

        for (let i = 0; i < subscribers.length; i += SUB_BATCH_SIZE) {
            const batch = subscribers.slice(i, i + SUB_BATCH_SIZE);
            await Promise.all(batch.map(async (sub) => {
                try {
                    await bot.telegram.forwardMessage(sub.userId, replyTo.chat.id, replyTo.message_id);
                    sentSubs++;
                } catch (err) {
                    const code = err?.response?.error_code;
                    if (code === 403 || code === 400) {
                        // User block bot, hapus dari DB
                        await subscribersColl.deleteOne({ userId: sub.userId });
                    }
                }
            }));
            if (i + SUB_BATCH_SIZE < subscribers.length) await sleep(SUB_DELAY_BETWEEN_BATCH);
        }
    }

    isBroadcastRunning = false;
    ctx.reply(`✅ Broadcast Selesai.\nGroups: ${sentGroups}\nSubscribers: ${sentSubs}`);
});


// ================= FEEDBACK SYSTEM & DYNAMIC HANDLER =================
bot.on("message", async (ctx) => {
    const msg = ctx.message;
    const text = (msg.text || "").toString();

    // 1. Jika di Private Chat (User -> Bot)
    if (ctx.chat.type === "private") {
        // Abaikan command
        if (text.startsWith("/")) return;

        // A. Cek Dynamic Link Menu
        if (CASH.linkMenuData[text]) {
            const data = CASH.linkMenuData[text];
            return await ctx.reply("Tekan butang di bawah untuk buka:", {
                ...Markup.inlineKeyboard([[Markup.button.url(data.label, data.url)]])
            });
        }

        // B. Cek Dynamic Main Menu
        if (CASH.menuData[text]) {
            const data = CASH.menuData[text];
            try {
                return await ctx.replyWithPhoto(data.media, {
                    caption: data.caption,
                    ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
                });
            } catch (err) {
                console.error("Ralat hantar foto:", err.message);
                return await ctx.reply(data.caption + `\n\n🔗 ${data.url}`, {
                    ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
                });
            }
        }

        // C. Default: Forward pesan user ke LOG GROUP (Feedback System)
        try {
            const fwd = await ctx.forwardMessage(LOG_GROUP_ID);
            // Reply ke user bahwa pesan diterima (opsional, biar gak spamming user)
            // await ctx.reply("📩 Pesan anda telah diteruskan ke admin.");
        } catch (err) {
            console.error("Gagal forward feedback:", err);
        }
    }

    // 2. Jika di Log Group (Admin Reply -> User)
    else if (ctx.chat.id === LOG_GROUP_ID) {
        if (ctx.message.reply_to_message && ctx.message.reply_to_message.forward_origin) {
            const origin = ctx.message.reply_to_message.forward_origin;
            if (origin.type === "user") {
                const targetUserId = origin.sender_user.id;
                try {
                    // Copy pesan admin kembali ke user
                    await ctx.copyMessage(targetUserId);
                    await ctx.reply("✅ Balasan terkirim.");
                } catch (e) {
                    await ctx.reply(`❌ Gagal kirim (User block bot?): ${e.message}`);
                }
            }
        }
    }

    // 3. Moderasi Grup
    else {
        await handleModeration(ctx);
    }
});


// ================= EXPRESS =================
const app = express();
app.get("/", (req, res) => res.send("Bot V2 Online (Dynamic Config Enabled)"));
app.get("/health", (req, res) => res.json({ status: "ok", config: CASH }));

// ================= START =================
async function main() {
    await connectMongo();
    app.listen(PORT, () => console.log(`Server run on ${PORT}`));
    bot.launch().then(() => console.log("Bot V2 Started"));
}
main();
