// bot.js
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";
dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const ADMIN_USER_ID = 8146896736 8220185234 8261909092 ;
const SOURCE_CHAT_ID = -1002626291566;
const TARGET_CHAT_IDS = [-1003351929392, -1003386119312 -1003351929392 -1003443785953 -1003386119312 -1003355430208 -1003303586267 -1003175423118 -1003418215358 -1003410432304 -1003390131591 -1003379058057];

const bot = new Telegraf(BOT_TOKEN);

// ================== SUBSCRIBERS STORAGE ==================
const SUBSCRIBERS_FILE = "subscribers.json";
let subscribers = [];

try {
  if (fs.existsSync(SUBSCRIBERS_FILE)) {
    const raw = fs.readFileSync(SUBSCRIBERS_FILE, "utf8");
    subscribers = JSON.parse(raw || "[]");
    if (!Array.isArray(subscribers)) subscribers = [];
  }
} catch (e) {
  subscribers = [];
}

function saveSubscribers() {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

// ================== INLINE BUTTONS (TANPA URL) ==================
function inlineButtons() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(" 🌟 STEP FREE CREDIT 🌟 ", "NEW_REGISTER")],
    [Markup.button.callback(" 📘 SHARE FACEBOOK 📘 ", "SHARE_FACEBOOK")],
    [Markup.button.callback(" 🔥 DAILY APPS FREE 🔥 ", "DAILY_APPS")],
    [Markup.button.callback(" 🎉 TELEGRAM BONUS 🎉 ", "TELEGRAM_BONUS")],
    [Markup.button.callback(" 🌞 SOCIAL MEDIA 🌞 ", "SOCIAL_MEDIA")]
  ]);
}

// ================== START ==================
async function sendStart(ctx) {
  const user = ctx.from || {};
  const username = user.username
    ? `@${user.username}`
    : user.first_name || "Tuan/Puan";

  if (user.id && !subscribers.includes(user.id)) {
    subscribers.push(user.id);
    saveSubscribers();
  }

  const mediaUrl =
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZudGg2bTVteGx2N3EwYng4a3ppMnhlcmltN2p2MTVweG1laXkyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXSLbuTIf37SjvE6QY/giphy.gif";

  await ctx.replyWithAnimation(mediaUrl, {
    caption: `👋 Hi ${username}

Bossku 😘  
Sila pilih menu di bawah 👇`,
    ...inlineButtons()
  });
}

bot.start(sendStart);
bot.command("menu", sendStart);
bot.command("help", sendStart);

// ================== MENU DATA ==================
const menuData = {
  "NEW_REGISTER": {
    media: "https://ibb.co/BK2LVQ6t",
    caption: `🌟 STEP FREE CREDIT 🌟
Hallo Bossku! Ini Langkah-Langkah Step Untuk New Register Free RM88 Sila Baca Dengan Teliti Ya 🥰

1️⃣. 📢 Join our Telegram channel ➡️ 🌐 
https://t.me/+NQBQYnGkNUU5YmNl

2️⃣. 👥 Join our Facebook group➡️ 📘
 https://web.facebook.com/profile.php?id=61581338594732

3️⃣. 📨 Share post ke 10 Casino Malaysia Group ➡️ 
📘 https://www.facebook.com/share/p/1K6JKcn1zw/

Lepastu send kat TELEGRAM AMOI 1 by 1 ya boss Thankyou

➤ /start untuk menu`
  },
  "SHARE_FACEBOOK": {
    media: "https://ibb.co/Z6B55VcX",
    caption: `📘 SHARE FACEBOOK
Free Credit RM68

➤ /start untuk menu`
  },
  "DAILY_APPS": {
    media: "https://ibb.co/nsmVQFbg",
    caption: `🔥 DAILY APPS FREE
Free Credit RM20

➤ /start untuk menu`
  },
  "TELEGRAM_BONUS": {
    media: "https://ibb.co/21qTqmtY",
    caption: `🎉 TELEGRAM BONUS
Free Credit RM30

➤ /start untuk menu`
  },
  "SOCIAL_MEDIA": {
    media: "https://ibb.co/HfyD6DWw",
    caption: `🌞 SOCIAL MEDIA
Facebook | Instagram | WhatsApp

➤ /start untuk menu`
  }
};

// ================== INLINE ACTION HANDLER ==================
bot.action(
  ["NEW_REGISTER", "SHARE_FACEBOOK", "DAILY_APPS", "TELEGRAM_BONUS", "SOCIAL_MEDIA"],
  async (ctx) => {
    await ctx.answerCbQuery();

    const key = ctx.callbackQuery.data;
    const data = menuData[key];
    if (!data) return;

    await ctx.replyWithPhoto(data.media, {
      caption: data.caption,
      ...inlineButtons()
    });
  }
);

// ================== COMMAND /unsub ==================
bot.command("unsub", async (ctx) => {
  const id = ctx.from.id;
  subscribers = subscribers.filter((x) => x !== id);
  saveSubscribers();
  await ctx.reply("✅ Anda telah unsubscribe.");
});

// ================== FORWARD ADMIN ==================
bot.command("forward", async (ctx) => {
  if (ctx.from.id !== ADMIN_USER_ID) return;
  if (!ctx.message.reply_to_message) return;

  const msg = ctx.message.reply_to_message;

  for (const target of TARGET_CHAT_IDS) {
    await bot.telegram.forwardMessage(
      target,
      msg.chat.id,
      msg.message_id
    );
  }

  for (const sub of [...subscribers]) {
    try {
      await bot.telegram.forwardMessage(
        sub,
        msg.chat.id,
        msg.message_id
      );
    } catch {
      subscribers = subscribers.filter((x) => x !== sub);
      saveSubscribers();
    }
  }
});

// ================== AUTO INLINE REPOST ==================
bot.on(["text", "photo", "video", "animation"], async (ctx) => {
  if (ctx.chat.id !== SOURCE_CHAT_ID) return;
  if (ctx.from.id !== ADMIN_USER_ID) return;

  try { await ctx.deleteMessage(); } catch {}

  const buttons = Markup.inlineKeyboard([
    [Markup.button.url("🎮 Register", "https://afb88my1.com/register/SMSRegister")],
    [Markup.button.url("🎁 Bonus", "https://afb88my1.com/promotion")]
  ]);

  if (ctx.message.text) {
    await ctx.reply(ctx.message.text, buttons);
  } else if (ctx.message.photo) {
    await ctx.replyWithPhoto(ctx.message.photo[0].file_id, {
      caption: ctx.message.caption || "",
      ...buttons
    });
  }
});

// ================== START BOT ==================
bot.launch();
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

// ================== KEEP ALIVE ==================
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => res.send("Bot is running"));
app.listen(PORT);
