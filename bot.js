// ================= IMPORT =================
import { Telegraf, Markup } from "telegraf";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("❌ BOT_TOKEN environment variable not found!");
}

const ADMIN_USER_ID = 8146896736;
const SOURCE_CHAT_ID = -1002626291566;
const TARGET_CHAT_IDS = [-1003175423118, -1003443785953];
const AUTO_DELETE_DELAY = 5000; // ms

const bot = new Telegraf(BOT_TOKEN);

// ================= SUBSCRIBERS (in-memory) =================
const subscribers = new Set();

// ================= MENU DATA =================
const menu_data = {
  "🌟 NEW REGISTER FREE 🌟": {
    url: "https://afb88.hfcapital.top/",
    media: "https://i.ibb.co/BK2LVQ6t/image.png",
    caption: "🌟 NEW REGISTER BONUS 🌟\n⚠️ 1 NAMA 1 ID SAHAJA..."
  },
  "📘 SHARE FACEBOOK 📘": {
    url: "https://afb88.hfcapital.top/",
    media: "https://i.ibb.co/Z6B55VcX/image.png",
    caption: "📘 SHARE FACEBOOK 📘\n🧧 FREE CREDIT RM68..."
  },
  "🔥 DAILY APPS FREE 🔥": {
    url: "https://afb88.hfcapital.top/",
    media: "https://i.ibb.co/nsmVQFbg/image.png",
    caption: "🔥 DAILY APPS FREE 🔥\n🎁 Free Credit RM20..."
  },
  "🌞 SOCIAL MEDIA 🌞": {
    url: "https://afb88.hfcapital.top/",
    media: "https://i.ibb.co/HfyD6DWw/image.png",
    caption: "🌞 SOCIAL MEDIA 🌞\n📌FOLLOW SOCIAL MEDIA..."
  },
  "🎉 TELEGRAM BONUS 🎉": {
    url: "https://afb88.hfcapital.top/",
    media: "https://i.ibb.co/21qTqmtY/image.png",
    caption: "🎉 TELEGRAM BONUS 🎉\n🎁 SUBSCRIBE TELEGRAM BONUS..."
  }
};

// ================= HELPER =================
async function addSubscriber(user) {
  if (!subscribers.has(user.id)) {
    subscribers.add(user.id);
    try {
      await bot.telegram.sendMessage(
        ADMIN_USER_ID,
        `📌 Subscriber baru: @${user.username || user.first_name} (${user.id})`
      );
    } catch {}
  }
}

// ================= START =================
bot.start(async (ctx) => {
  const user = ctx.from;
  const username = user.username
    ? `@${user.username}`
    : user.first_name || "Bossku";

  await addSubscriber(user);

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

  try {
    await ctx.replyWithAnimation(
      "https://media.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif",
      {
        caption: `👋 Hi ${username} Bossku 😘 Sila join semua group dulu ya ...`,
        ...inlineButtons
      }
    );
  } catch {}

  await ctx.reply("➤ CLICK /start TO BACK MENU", replyKeyboard);
});

// alias command
["menu", "help", "about", "profile", "contact"].forEach(cmd => {
  bot.command(cmd, (ctx) => ctx.scene?.enter?.("start") || bot.handleUpdate(ctx.update));
});

// ================= MENU HANDLER =================
bot.on("text", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const text = ctx.message.text;
  const data = menu_data[text];
  if (!data) return;

  try {
    await ctx.replyWithPhoto(data.media, {
      caption: data.caption,
      reply_markup: {
        inline_keyboard: [[{ text: "CLAIM 🎁", url: data.url }]]
      }
    });
  } catch (e) {
    console.log("Menu reply error:", e);
  }
});

// ================= FORWARD COMMAND =================
bot.command("forward", async (ctx) => {
  if (
    ctx.from.id !== ADMIN_USER_ID ||
    ctx.chat.id !== SOURCE_CHAT_ID
  ) return;

  const reply = ctx.message.reply_to_message;
  if (!reply) return;

  for (const target_id of TARGET_CHAT_IDS) {
    if (target_id === SOURCE_CHAT_ID) continue;
    try {
      await bot.telegram.forwardMessage(
        target_id,
        reply.chat.id,
        reply.message_id
      );
    } catch (e) {
      console.log("Forward error:", e);
    }
  }

  for (const sub of [...subscribers]) {
    try {
      await bot.telegram.forwardMessage(
        sub,
        reply.chat.id,
        reply.message_id
      );
      await new Promise(r => setTimeout(r, 700));
    } catch (e) {
      subscribers.delete(sub);
    }
  }

  try {
    await ctx.deleteMessage();
  } catch {}
});

// ================= UNSUB =================
bot.command("unsub", async (ctx) => {
  subscribers.delete(ctx.from.id);
  await ctx.reply("✅ Anda telah berhenti langganan.");
});

// ================= AUTO DELETE =================
bot.on("message", async (ctx) => {
  if (
    ctx.chat.id === SOURCE_CHAT_ID &&
    ctx.from.id === ctx.botInfo.id
  ) {
    setTimeout(async () => {
      try {
        await ctx.deleteMessage();
      } catch {}
    }, AUTO_DELETE_DELAY);
  }
});

// ================= KEEP ALIVE =================
const app = express();

app.get("/", (req, res) => {
  res.send("🤖 Bot sedang berjalan");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Web server running"));

// ================= RUN =================
bot.launch();
console.log("✅ Bot sedang dijalankan...");

// graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
