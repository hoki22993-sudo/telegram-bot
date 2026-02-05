// bot.js — CHOREO FINAL VERSION
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USER_ID = 8146896736;
const SOURCE_CHAT_ID = -1002626291566;
const TARGET_CHAT_IDS = [-1003175423118, -1003443785953];

const PORT = process.env.PORT || 443;
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;

if (!BOT_TOKEN || !WEBHOOK_DOMAIN) {
  throw new Error("❌ BOT_TOKEN atau WEBHOOK_DOMAIN belum diset");
}

const bot = new Telegraf(BOT_TOKEN);

// ================= SUBSCRIBERS (MEMORY ONLY) =================
let subscribers = [];

// ================= START / MENU =================
async function sendStart(ctx) {
  const user = ctx.from || {};
  const username =
    user.username ? `@${user.username}` : user.first_name || "Bossku";

  if (user.id && !subscribers.includes(user.id)) {
    subscribers.push(user.id);
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
      caption: `👋 Hi ${username}

Bossku 😘  
Kalau sudah subscribe, amoi pasti kasi untung terbaik ❤️  
Sila join semua group dulu ya`,
      ...inlineButtons
    }
  );

  await ctx.reply("➤ CLICK /start TO BACK MENU", replyKeyboard);
}

bot.start(sendStart);
bot.command(["menu", "help", "about", "profile", "contact"], sendStart);

// ================= MENU DATA =================
const menuData = {
  "🌟 NEW REGISTER FREE 🌟": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/BK2LVQ6t",
    caption: "🌟 NEW REGISTER BONUS 🌟\n\n➤ CLICK /start TO BACK MENU"
  },
  "📘 SHARE FACEBOOK 📘": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/Z6B55VcX",
    caption: "📘 SHARE FACEBOOK 📘\n\n➤ CLICK /start TO BACK MENU"
  },
  "🔥 DAILY APPS FREE 🔥": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/nsmVQFbg",
    caption: "🔥 DAILY APPS FREE 🔥\n\n➤ CLICK /start TO BACK MENU"
  },
  "🌞 SOCIAL MEDIA 🌞": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/HfyD6DWw",
    caption: "🌞 SOCIAL MEDIA 🌞\n\n➤ CLICK /start TO BACK MENU"
  },
  "🎉 TELEGRAM BONUS 🎉": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/21qTqmtY",
    caption: "🎉 TELEGRAM BONUS 🎉\n\n➤ CLICK /start TO BACK MENU"
  }
};

bot.hears(Object.keys(menuData), async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const data = menuData[ctx.message.text];
  if (!data) return;

  await ctx.replyWithPhoto(data.media, {
    caption: data.caption,
    ...Markup.inlineKeyboard([
      [Markup.button.url("CLAIM 🎁", data.url)]
    ])
  });
});

// ================= /forward (ADMIN ONLY) =================
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
    } catch {}
  }

  for (const subId of subscribers) {
    try {
      await bot.telegram.forwardMessage(
        subId,
        replyTo.chat.id,
        replyTo.message_id,
        { disable_notification: true }
      );
      await new Promise(r => setTimeout(r, 600));
    } catch {
      subscribers = subscribers.filter(id => id !== subId);
    }
  }

  try { await ctx.deleteMessage(); } catch {}
});

// ================= /unsub =================
bot.command("unsub", async (ctx) => {
  subscribers = subscribers.filter(id => id !== ctx.from.id);
  await ctx.reply("✅ Anda telah berhenti langganan.");
});

// ================= EXPRESS + WEBHOOK (FIXED & SAFE) =================
const app = express();

// webhook path unik (WAJIB)
const webhookPath = `/telegraf/${BOT_TOKEN}`;

// set webhook ke Telegram
bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}${webhookPath}`);

// terima webhook dari Telegram
app.use(bot.webhookCallback(webhookPath));

// health check
app.get("/", (_, res) => {
  res.send("🤖 Bot Telegram Choreo berjalan");
});

// start server
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Bot running on Choreo");
});
