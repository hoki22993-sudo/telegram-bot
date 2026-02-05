// bot.js
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";

dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const ADMIN_USER_ID = 8146896736;
const SOURCE_CHAT_ID = -1002626291566;
const TARGET_CHAT_IDS = [-1003175423118, -1003443785953];
const AUTO_DELETE_DELAY = 5000;

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

// ================= START / MENU =================
async function sendStart(ctx) {
    const user = ctx.from || {};
    const username = user.username ? `@${user.username}` : user.first_name || "Bossku";

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

// ================= MENU DATA PRIVATE =================
const menuData = {
    "🌟 NEW REGISTER FREE 🌟": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/BK2LVQ6t",
        caption: `🌟 NEW REGISTER BONUS 🌟
⚠️ LANGGAR SYARAT AKAN FORFEITED SEMUA POINT ⚠️
➤ CLICK /start TO BACK MENU`
    },
    "📘 SHARE FACEBOOK 📘": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/Z6B55VcX",
        caption: `📘 SHARE FACEBOOK 📘
🧧 FREE CREDIT RM68 🧧
➤ CLICK /start TO BACK MENU`
    },
    "🔥 DAILY APPS FREE 🔥": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/nsmVQFbg",
        caption: `🔥 DAILY APPS FREE 🔥
🎁 Free Credit RM20
➤ CLICK /start TO BACK MENU`
    },
    "🌞 SOCIAL MEDIA 🌞": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/HfyD6DWw",
        caption: `🌞 SOCIAL MEDIA 🌞
➤ CLICK /start TO BACK MENU!`
    },
    "🎉 TELEGRAM BONUS 🎉": {
        url: "https://afb88my1.com/promotion",
        media: "https://ibb.co/21qTqmtY",
        caption: `🎉 TELEGRAM BONUS 🎉
➤ CLICK /start TO BACK MENU`
    }
};

bot.hears(Object.keys(menuData), async (ctx) => {
    if (ctx.chat.type !== "private") return;

    const data = menuData[ctx.message.text];
    if (!data) return;

    await ctx.replyWithPhoto(data.media, {
        caption: data.caption,
        ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
    });
});

// ================= /forward COMMAND =================
bot.command("forward", async (ctx) => {
    if (ctx.from.id !== ADMIN_USER_ID) return;
    if (ctx.chat.id !== SOURCE_CHAT_ID) return;

    const replyTo = ctx.message.reply_to_message;
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
            console.error("Forward error:", err);
        }
    }

    for (let i = 0; i < subscribers.length; i++) {
        const subId = subscribers[i];
        try {
            await bot.telegram.forwardMessage(
                subId,
                replyTo.chat.id,
                replyTo.message_id
            );
            await new Promise(r => setTimeout(r, 500));
        } catch {
            subscribers = subscribers.filter(id => id !== subId);
            saveSubscribers();
        }
    }

    try { await ctx.deleteMessage(); } catch {}
});

// ================= AUTO DELETE FORWARD DI SOURCE GROUP =================
bot.on("message", async (ctx) => {
    if (ctx.chat.id !== SOURCE_CHAT_ID) return;

    const msg = ctx.message;

    if (msg.forward_from || msg.forward_from_chat || ctx.from?.is_bot) {
        setTimeout(async () => {
            try {
                await ctx.deleteMessage();
            } catch (err) {
                console.log("Auto delete gagal:", err.message);
            }
        }, AUTO_DELETE_DELAY);
    }
});

// ================= /unsub =================
bot.command("unsub", async (ctx) => {
    subscribers = subscribers.filter(id => id !== ctx.from.id);
    saveSubscribers();
    await ctx.reply("✅ Anda telah berhenti langganan.");
});

// ================= START BOT =================
bot.launch();
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// ================= KEEP ALIVE =================
const app = express();
app.get("/", (_, res) => res.send("🤖 Bot sedang berjalan"));
app.listen(process.env.PORT || 10000);
