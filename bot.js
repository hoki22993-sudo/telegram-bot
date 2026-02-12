// ================= IMPORT =================
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";

dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN tidak dijumpai dalam ENV!");
    process.exit(1);
}

const ADMIN_USER_ID = 8146896736;
const SOURCE_CHAT_ID = -1002626291566;

const TARGET_CHAT_IDS = [
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
    -1003175423118,
    -1003418215358,
    -1003410432304,
    -1003390131591,
    -1003379058057
];

const AUTO_DELETE_DELAY = 5000;

const bot = new Telegraf(BOT_TOKEN);

// ================= SUBSCRIBERS STORAGE =================
const SUBSCRIBERS_FILE = "./subscribers.json";
let subscribers = [];

try {
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
        subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf8") || "[]");
        if (!Array.isArray(subscribers)) subscribers = [];
    }
} catch (err) {
    console.error("❌ Error baca subscribers:", err);
    subscribers = [];
}

function saveSubscribers() {
    try {
        fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
    } catch (err) {
        console.error("❌ Error save subscribers:", err);
    }
}

// ================= START FUNCTION =================
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

// ================= SAFE AUTO DELETE =================
bot.on("message", async (ctx) => {
    if (!bot.botInfo) return;

    if (ctx.chat.id === SOURCE_CHAT_ID && ctx.from?.id === bot.botInfo.id) {
        setTimeout(async () => {
            try { await ctx.deleteMessage(); } catch {}
        }, AUTO_DELETE_DELAY);
    }
});

// ================= START BOT =================
(async () => {
    try {
        await bot.launch();
        console.log("✅ Bot berjaya start!");
    } catch (err) {
        console.error("❌ Bot gagal start:", err);
        process.exit(1);
    }
})();

// ================= EXPRESS KEEP ALIVE =================
const app = express();
app.get("/", (_, res) => res.send("🤖 Bot sedang berjalan"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
