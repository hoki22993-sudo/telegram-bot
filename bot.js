// bot.js
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";

dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const ADMIN_USER_ID = 8146896736; // ID admin
const PORT = parseInt(process.env.PORT || "10000", 10);

// ===== GROUP & CHANNEL =====
const SOURCE_CHAT_ID = -1002626291566; // GROUP UTAMA

const TARGET_CHAT_IDS = [
    // ===== GROUP =====
    -1003443785953,
    -1003355430208,
    -1003303586267,
    -1003351929392,
    -1003386119312,
    -1002068306604,
    -1002174638632,
    -1002112370494,
    -1002199080095,
    -1001925377693,
    -1002153443910,

    // ===== CHANNEL =====
    -1003175423118,
    -1003418215358,
    -1003410432304,
    -1003390131591,
    -1003379058057
];

const AUTO_DELETE_DELAY = 5000; // ms

const bot = new Telegraf(BOT_TOKEN);

// ================= SUBSCRIBERS STORAGE =================
const SUBSCRIBERS_FILE = "subscribers.json";
let subscribers = [];

try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
        subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf8") || "[]");
        if (!Array.isArray(subscribers)) subscribers = [];
    }
} catch {
    subscribers = [];
}

function saveSubscribers() {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

// ================= EXPRESS (Harus jalan dulu untuk health check) =================
const app = express();
app.get("/", (_, res) => res.send("🤖 Bot sedang berjalan"));
app.get("/health", (_, res) => res.json({ status: "ok", bot: "running" }));

// ================= START / MENU =================
async function sendStart(ctx) {
    const user = ctx.from || {};
    const username = user.username ? `@${user.username}` : user.first_name || "Bossku";

    // Tambah subscriber
    if (user.id && !subscribers.includes(user.id)) {
        subscribers.push(user.id);
        saveSubscribers();

        try {
            await bot.telegram.sendMessage(
                ADMIN_USER_ID,
                `📌 Subscriber baru: ${username} (${user.id})`
            );
        } catch {}
    }

    const inlineButtons = Markup.inlineKeyboard([
        [Markup.button.url("📢 SUBSCRIBE CHANNEL", "https://t.me/afb88my")],
        [Markup.button.url("💬 GROUP CUCI & TIPS GAME", "https://t.me/+b685QE242dMxOWE9")],
        [Markup.button.url("🌐 REGISTER & LOGIN", "https://afb88my1.com/")],
        [Markup.button.url("🎁 GROUP HADIAH AFB88", "https://t.me/Xamoi2688")]
    ]);

    const replyKeyboard = Markup.keyboard([
        ["🌟 NEW REGISTER FREE 🌟"],
        ["📘 SHARE FACEBOOK 📘"],
        ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
        ["🎉 TELEGRAM BONUS 🎉"]
    ]).resize();

    await ctx.replyWithAnimation(
        "https://media3.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif",
        {
            caption: `👋 Hi ${username} Bossku 😘 Kalau sudah subscribe, amoi pasti kasi untung terbaik ❤️ Sila join semua group dulu ya, ...`,
            ...inlineButtons
        }
    );

    await ctx.reply("➤ CLICK /start TO BACK MENU", replyKeyboard);
}

bot.start(sendStart);
bot.command(["menu", "help", "about", "profile", "contact"], sendStart);

// ================= MENU DATA PRIVATE (key HARUS sama dengan keyboard) =================
const menuData = {
    "🌟 NEW REGISTER FREE 🌟": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/BK2LVQ6t",
        caption: `🌟 NEW REGISTER BONUS 🌟
⚠️ LANGGAR SYARAT AKAN FORFEITED SEMUA POINT ⚠️
✅ Keperluan SLOT ONLY
✅ Free Credit R188
✅ Min WD/CUCI RM 6600
✅ Max Payment/WD RM20
✅ Dibenarkan Main AFB GAMING ( EVENT GAME ONLY)
✅ Dibenarkan Main MEGAH5|EPICWIN|PXPLAY2|ACEWIN2|RICH GAMING (EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM
CLICK LINK: https://afb88.hfcapital.top/
⚠️ 1 NAMA 1 ID SAHAJA
⚠️ NAMA DAFTAR MESTI SAMA DENGAN NAMA AKAUN BANK
➤ CLICK /start TO BACK MENU`
    },
    "📘 SHARE FACEBOOK 📘": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/Z6B55VcX",
        caption: `📘 SHARE FACEBOOK 📘
🧧 FREE CREDIT RM68 🧧
✅ Join Telegram Channel
✅ Join Facebook Group
➡️ Share ke 5 Casino Group
➡️ Daily Claim X1
➤ CLICK /start TO BACK MENU`
    },
    "🔥 DAILY APPS FREE 🔥": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/nsmVQFbg",
        caption: `🔥 DAILY APPS FREE 🔥
🎁 Free Credit RM20
📌 Daily Claim X1
💰 Min WD RM600
➤ CLICK /start TO BACK MENU`
    },
    "🌞 SOCIAL MEDIA 🌞": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/HfyD6DWw",
        caption: `🌞 SOCIAL MEDIA 🌞
📘 Facebook
📸 Instagram
🎥 WhatsApp Group
➤ CLICK /start TO BACK MENU`
    },
    "🎉 TELEGRAM BONUS 🎉": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/21qTqmtY",
        caption: `🎉 TELEGRAM BONUS 🎉
🎁 Free Credit RM30
✅ Claim X1
➤ CLICK /start TO BACK MENU`
    }
};

bot.hears(Object.keys(menuData), async (ctx) => {
    if (ctx.chat?.type !== "private") return;

    const data = menuData[ctx.message?.text];
    if (!data) return;

    try {
        await ctx.replyWithPhoto(data.media, {
            caption: data.caption,
            ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
        });
    } catch (err) {
        console.error("Error send photo:", err.message);
        await ctx.reply(data.caption + `\n\n🔗 ${data.url}`, {
            ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
        });
    }
});

// ================= /forward COMMAND =================
bot.command("forward", async (ctx) => {
    if (!ctx.from || ctx.from.id !== ADMIN_USER_ID) return;
    if (ctx.chat?.id !== SOURCE_CHAT_ID) return;

    const replyTo = ctx.message?.reply_to_message;
    if (!replyTo) return;

    for (const targetId of TARGET_CHAT_IDS) {
        try {
            await bot.telegram.forwardMessage(
                targetId,
                replyTo.chat.id,
                replyTo.message_id,
                { disable_notification: true }
            );
        } catch (err) {
            try {
                await bot.telegram.sendMessage(
                    ADMIN_USER_ID,
                    `❌ Error forward ke ${targetId}`
                );
            } catch {}
        }
    }

    for (let i = 0; i < subscribers.length; i++) {
        const subId = subscribers[i];
        try {
            await bot.telegram.forwardMessage(
                subId,
                replyTo.chat.id,
                replyTo.message_id,
                { disable_notification: true }
            );
            await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
        } catch {
            subscribers = subscribers.filter(id => id !== subId);
            saveSubscribers();
        }
    }

    try { await ctx.deleteMessage(); } catch {}
});

// ================= /unsub COMMAND =================
bot.command("unsub", async (ctx) => {
    if (!ctx.from) return;
    subscribers = subscribers.filter(id => id !== ctx.from.id);
    saveSubscribers();
    await ctx.reply("✅ Anda telah berhenti langganan.");
});

// ================= AUTO DELETE BOT MESSAGE =================
bot.on("message", async (ctx) => {
    const botId = bot.botInfo?.id;
    if (!botId) return;
    if (ctx.chat?.id === SOURCE_CHAT_ID && ctx.from?.id === botId) {
        const chatId = ctx.chat.id;
        const msgId = ctx.message?.message_id;
        if (chatId && msgId) {
            setTimeout(() => {
                bot.telegram.deleteMessage(chatId, msgId).catch(() => {});
            }, AUTO_DELETE_DELAY);
        }
    }
});

// ================= STARTUP =================
async function main() {
    // 1. Express dulu (untuk health check cloud platform)
    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`✅ Server listening on port ${PORT}`);
    });

    // 2. Jalankan bot
    try {
        await bot.launch();
        console.log("✅ Bot Telegram berjalan");
    } catch (err) {
        console.error("❌ Gagal start bot:", err.message);
        server.close();
        process.exit(1);
    }

    // Graceful shutdown
    const stop = () => {
        bot.stop("SIGTERM");
        server.close(() => process.exit(0));
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
}

main();
