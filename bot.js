// ================= IMPORT =================
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";
dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const BOT_URL = process.env.BOT_URL || "https://YOUR-CHOREO-URL"; // Ganti dengan URL Choreo kamu
const PORT = process.env.PORT || 10000;

// ================= ADMIN (BOLEH RAMAI) =================
const ADMIN_USER_IDS = [
  8146896736,
  8220185234,
  8261909092
];

// ================= CHAT SUMBER (OPTIONAL) =================
const SOURCE_CHAT_ID = -1002626291566;

// ================= TARGET GROUP & CHANNEL (AUTO FORWARD) =================
const TARGET_CHAT_IDS = [
  // GROUP LAMA
  -1003175423118,


  // GROUP BARU (DITAMBAH)

];

// ================= BOT =================
const bot = new Telegraf(BOT_TOKEN);

// ================= SUBSCRIBERS =================
const SUBSCRIBERS_FILE = "subscribers.json";
let subscribers = [];

if (fs.existsSync(SUBSCRIBERS_FILE)) {
  try {
    subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf8")) || [];
  } catch {
    subscribers = [];
  }
}

function saveSubscribers() {
  fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
}

// ================= INLINE BUTTON =================
function inlineButtons() {
  return Markup.inlineKeyboard([
    [Markup.button.callback(" 🌟 STEP FREE CREDIT 🌟 ", "NEW_REGISTER")],
    [Markup.button.callback(" 📘 SHARE FACEBOOK 📘 ", "SHARE_FACEBOOK")],
    [Markup.button.callback(" 🔥 DAILY APPS FREE 🔥 ", "DAILY_APPS")],
    [Markup.button.callback(" 🎉 TELEGRAM BONUS 🎉 ", "TELEGRAM_BONUS")],
    [Markup.button.callback(" 🌞 SOCIAL MEDIA 🌞 ", "SOCIAL_MEDIA")]
  ]);
}

// ================= START =================
async function sendStart(ctx) {
  const user = ctx.from;
  const name = user.username ? `@${user.username}` : user.first_name;

  if (!subscribers.includes(user.id)) {
    subscribers.push(user.id);
    saveSubscribers();
  }

  await ctx.replyWithAnimation(
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZudGg2bTVteGx2N3EwYng4a3ppMnhlcmltN2p2MTVweG1laXkyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXSLbuTIf37SjvE6QY/giphy.gif",
    {
      caption: `👋 Hi ${name}\n\nBossku 😘\nSila pilih menu di bawah 👇`,
      ...inlineButtons()
    }
  );
}

bot.start(sendStart);
bot.command("menu", sendStart);
bot.command("help", sendStart);

// ================= MENU DATA =================
const menuData = {
  NEW_REGISTER: {
    media: "https://ibb.co/BK2LVQ6t",
    caption: `🌟 STEP FREE CREDIT 🌟

1️⃣ Join Telegram  
https://t.me/+NQBQYnGkNUU5YmNl

2️⃣ Join Facebook  
https://web.facebook.com/profile.php?id=61581338594732

3️⃣ Share post  
https://www.facebook.com/share/p/1K6JKcn1zw/

Hantar bukti ke Telegram Amoi 1 by 1 ya boss 🙏

➤ /start`
  },
  SHARE_FACEBOOK: {
    media: "https://ibb.co/Z6B55VcX",
    caption: "📘 SHARE FACEBOOK\nFree Credit RM68\n\n➤ /start"
  },
  DAILY_APPS: {
    media: "https://ibb.co/nsmVQFbg",
    caption: "🔥 DAILY APPS FREE\nFree Credit RM20\n\n➤ /start"
  },
  TELEGRAM_BONUS: {
    media: "https://ibb.co/21qTqmtY",
    caption: "🎉 TELEGRAM BONUS\nFree Credit RM30\n\n➤ /start"
  },
  SOCIAL_MEDIA: {
    media: "https://ibb.co/HfyD6DWw",
    caption: "🌞 SOCIAL MEDIA\nFacebook | Instagram | WhatsApp\n\n➤ /start"
  }
};

// ================= INLINE HANDLER =================
bot.action(Object.keys(menuData), async (ctx) => {
  await ctx.answerCbQuery();
  const data = menuData[ctx.callbackQuery.data];
  if (!data) return;

  await ctx.replyWithPhoto(data.media, {
    caption: data.caption,
    ...inlineButtons()
  });
});

// ================= MANUAL FORWARD (ADMIN ONLY) =================
bot.command("forward", async (ctx) => {
  if (!ADMIN_USER_IDS.includes(ctx.from.id)) return;

  if (!ctx.message.reply_to_message) {
    try { await bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id); } catch {}
    return;
  }

  const msg = ctx.message.reply_to_message;

  for (const target of TARGET_CHAT_IDS) {
    try {
      await bot.telegram.forwardMessage(target, msg.chat.id, msg.message_id, { disable_notification: true });
    } catch (err) {
      console.log("Forward error:", err);
    }
  }

  try { await bot.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id); } catch {}
});

// ================= UNSUB =================
bot.command("unsub", async (ctx) => {
  subscribers = subscribers.filter(id => id !== ctx.from.id);
  saveSubscribers();
  await ctx.reply("✅ Anda telah unsubscribe.");
});

// ================= AUTO FORWARD DARI SOURCE KE TARGET & SUBSCRIBER =================
if (SOURCE_CHAT_ID) {
  bot.on("message", async (ctx) => {
    const msg = ctx.message;

    if (msg.chat.id !== SOURCE_CHAT_ID) return; // hanya dari source

    // Forward ke target group/channel
    for (const target of TARGET_CHAT_IDS) {
      if (target === SOURCE_CHAT_ID) continue;
      try {
        await bot.telegram.forwardMessage(target, msg.chat.id, msg.message_id, { disable_notification: true });
      } catch (err) {
        console.log("Forward error to target:", err);
      }
    }

    // Forward ke semua subscriber
    for (const userId of subscribers) {
      try {
        await bot.telegram.forwardMessage(userId, msg.chat.id, msg.message_id, { disable_notification: true });
      } catch (err) {
        console.log("Forward error to subscriber:", err);
      }
    }
  });
}

// ================= EXPRESS + WEBHOOK =================
const app = express();
app.use(express.json());

// Telegram webhook callback
app.use(bot.webhookCallback("/bot"));

// Root route
app.get("/", (_, res) => res.send("Bot running"));

// Start server dan set webhook ke Telegram
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  const webhookUrl = `${BOT_URL}/bot`;
  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log("Webhook set:", webhookUrl);
  } catch (err) {
    console.error("Error setting webhook:", err);
  }
});
