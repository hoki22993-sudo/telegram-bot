// bot.js
import { Telegraf, Markup } from "telegraf";
import fs from "fs";
import express from "express";

// ================= CONFIG =================
// 🔴 PASTE TOKEN BETUL-BETUL
const BOT_TOKEN = "PASTE_TOKEN_TELEGRAM_KAU_DI_SINI";

const ADMIN_USER_ID = 8146896736;
const SOURCE_CHAT_ID = -1002626291566;
const TARGET_CHAT_IDS = [-1003175423118, -1003443785953];

if (!BOT_TOKEN || BOT_TOKEN.includes("PASTE_TOKEN")) {
  console.error("❌ BOT_TOKEN belum diset dengan betul");
}

// init bot
const bot = new Telegraf(BOT_TOKEN);

// ================== SUBSCRIBERS STORAGE ==================
const SUBSCRIBERS_FILE = "./subscribers.json";
let subscribers = [];

try {
  if (fs.existsSync(SUBSCRIBERS_FILE)) {
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    subscribers = Array.isArray(parsed) ? parsed : [];
  }
} catch (e) {
  console.error("❌ Failed load subscribers.json:", e);
  subscribers = [];
}

function saveSubscribers() {
  try {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
  } catch (e) {
    console.error("❌ Failed save subscribers.json:", e);
  }
}

// ================== START / MENU ==================
async function sendStart(ctx) {
  try {
    const user = ctx.from || {};
    const username =
      user.username ? `@${user.username}` : user.first_name || "Tuan/Puan";

    if (user.id && !subscribers.includes(user.id)) {
      subscribers.push(user.id);
      saveSubscribers();
    }

    const inlineButtons = Markup.inlineKeyboard([
      [Markup.button.url("📢 SUBSCRIBE CHANNEL", "https://t.me/afb88my")],
      [Markup.button.url("💬 GROUP CUCI & TIPS GAME", "https://t.me/+b685QE242dMxOWE9")],
      [Markup.button.url("🌐 REGISTER & LOGIN", "https://afb88my1.com/")],
      [Markup.button.url("🎁 GROUP HADIAH AFB88", "https://t.me/Xamoi2688")],
    ]);

    const replyKeyboard = Markup.keyboard([
      ["🌟 NEW REGISTER FREE 🌟"],
      ["📘 SHARE FACEBOOK 📘"],
      ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
      ["🎉 TELEGRAM BONUS 🎉"],
    ]).resize();

    const mediaUrl =
      "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZudGg2bTVteGx2N3EwYng4a3ppMnhlcmltN2p2MTVweG1laXkyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXSLbuTIf37SjvE6QY/giphy.gif";

    await ctx.replyWithAnimation(mediaUrl, {
      caption: `👋 Hi ${username},

Bossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yang terbaik!!
Sila join group2 yang saya share dulu. Pastikan anda dapat REZEKI di group2 saya ❤️`,
      ...inlineButtons,
    });

    await ctx.reply("➤ CLICK /start TO BACK MENU:", replyKeyboard);
  } catch (e) {
    console.error("❌ sendStart error:", e);
  }
}

bot.start(sendStart);
bot.command(["help", "menu", "about", "profile", "contact"], sendStart);

// ================== MENU DATA ==================
const menuData = {
  "🌟 NEW REGISTER FREE 🌟": {
    url: "https://afb88my1.com/promotion",
    media: "https://i.ibb.co/BK2LVQ6/new-register.jpg",
    caption: "🌟 NEW REGISTER BONUS 🌟\n\n➤ CLICK /start TO BACK MENU",
  },
  "📘 SHARE FACEBOOK 📘": {
    url: "https://afb88my1.com/promotion",
    media: "https://i.ibb.co/Z6B55VcX/facebook.jpg",
    caption: "📘 SHARE FACEBOOK 📘\n\n➤ CLICK /start TO BACK MENU",
  },
  "🔥 DAILY APPS FREE 🔥": {
    url: "https://afb88my1.com/promotion",
    media: "https://i.ibb.co/nsmVQFbg/daily.jpg",
    caption: "🔥 DAILY APPS FREE 🔥\n\n➤ CLICK /start TO BACK MENU",
  },
  "🌞 SOCIAL MEDIA 🌞": {
    url: "https://afb88my1.com/promotion",
    media: "https://i.ibb.co/HfyD6DWw/social.jpg",
    caption: "🌞 SOCIAL MEDIA 🌞\n\n➤ CLICK /start TO BACK MENU",
  },
  "🎉 TELEGRAM BONUS 🎉": {
    url: "https://afb88my1.com/promotion",
    media: "https://i.ibb.co/21qTqmtY/telegram.jpg",
    caption: "🎉 TELEGRAM BONUS 🎉\n\n➤ CLICK /start TO BACK MENU",
  },
};

bot.hears(Object.keys(menuData), async (ctx) => {
  try {
    if (ctx.chat.type !== "private") return;

    const data = menuData[ctx.message.text];
    if (!data) return;

    await ctx.replyWithPhoto(data.media, {
      caption: data.caption,
      ...Markup.inlineKeyboard([
        [Markup.button.url("CLAIM 🎁", data.url)],
      ]),
    });
  } catch (e) {
    console.error("❌ menu hears error:", e);
  }
});

// ================== AUTO INLINE (ADMIN ONLY) ==================
bot.on(["text", "photo", "video", "animation"], async (ctx) => {
  try {
    if (ctx.chat.id !== SOURCE_CHAT_ID) return;
    if (ctx.from.id !== ADMIN_USER_ID) return;

    const buttons = Markup.inlineKeyboard([
      [Markup.button.url("🎮 Register", "https://afb88my1.com/register/SMSRegister"),
       Markup.button.url("🌐 Login", "https://afb88my1.com/")],
    ]);

    try { await ctx.deleteMessage(); } catch {}

    if (ctx.message.text) {
      await ctx.reply(ctx.message.text, buttons);
    } else if (ctx.message.photo) {
      await ctx.replyWithPhoto(ctx.message.photo[0].file_id, {
        caption: ctx.message.caption || "",
        ...buttons,
      });
    }
  } catch (e) {
    console.error("❌ auto inline error:", e);
  }
});

// ================== SAFE START BOT (ANTI CRASH) ==================
let started = false;

async function startBot() {
  if (started) return;

  try {
    await bot.launch();
    started = true;
    console.log("🤖 Telegram bot RUNNING (Telegraf)");
  } catch (e) {
    console.error("❌ Bot launch failed:", e.message);
    console.log("⏳ Retry in 10 seconds...");
    setTimeout(startBot, 10000);
  }
}

startBot();

// ================== GRACEFUL STOP ==================
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// ================== HTTP SERVER (WAJIB UNTUK CHOREO) ==================
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("🤖 Telegram Bot is running (Choreo OK)");
});

app.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});
