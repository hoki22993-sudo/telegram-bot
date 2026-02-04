// bot.js
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";

dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID || "8146896736");
const SOURCE_CHAT_ID = parseInt(process.env.SOURCE_CHAT_ID || "-1002626291566");
const TARGET_CHAT_IDS = (process.env.TARGET_CHAT_IDS || "-1003175423118")
  .split(",")
  .map(id => parseInt(id.trim()));

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN belum diset di .env");
  process.exit(1);
}

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
  console.error("❌ Failed load subscribers.json, starting empty.", e);
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
    const username = user.username ? `@${user.username}` : (user.first_name || "Tuan/Puan");

    if (user && user.id && !subscribers.includes(user.id)) {
      subscribers.push(user.id);
      saveSubscribers();
    }

    const inlineButtons = Markup.inlineKeyboard([
      [Markup.button.url("📢 SUBSCRIBE CHANNEL", "https://t.me/afb88my")],
      [Markup.button.url("💬 GROUP CUCI & TIPS GAME", "https://t.me/+b685QE242dMxOWE9")],
      [Markup.button.url("🌐 REGISTER & LOGIN", "https://afb88my1.com/")],
      [Markup.button.url("🔞 AMOI VIDEO", "https://t.me/Xamoi2688")],
    ]);

    const replyKeyboard = Markup.keyboard([
      ["🌟 NEW REGISTER FREE 🌟"],
      ["📘 SHARE FACEBOOK 📘"],
      ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
      ["🎉 TELEGRAM BONUS 🎉"]
    ]).resize();

    const mediaUrl = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZudGg2bTVteGx2N3EwYng4a3ppMnhlcmltN2p2MTVweG1laXkyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXSLbuTIf37SjvE6QY/giphy.gif";

    await ctx.replyWithAnimation(mediaUrl, {
      caption: `👋 Hi ${username}, 

Bossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! 
Sila join group2 yang saya share dulu. Pastikan anda dapat REZEKI di group2 saya ❤️`,
      ...inlineButtons
    });

    await ctx.reply("➤ CLICK /start TO BACK MENU:", replyKeyboard);
  } catch (e) {
    console.error("❌ Error sendStart:", e);
  }
}

bot.start(sendStart);
bot.command("help", sendStart);
bot.command("menu", sendStart);
bot.command("about", sendStart);
bot.command("profile", sendStart);
bot.command("contact", sendStart);

// ================== MENU REPLY (PRIVATE CHAT) ==================
const menuData = {
  "🌟 NEW REGISTER FREE 🌟": { url: "https://afb88my1.com/promotion", media: "https://ibb.co/BK2LVQ6t", caption: "🌟 NEW REGISTER BONUS 🌟\n\n⚠️ 1 NAMA 1 ID SAHAJA, TIDAK BOLEH GUNA NAMA YANG SAMA\n\n➤ CLICK /start TO BACK MENU" },
  "📘 SHARE FACEBOOK 📘": { url: "https://afb88my1.com/promotion", media: "https://ibb.co/Z6B55VcX", caption: "📘 SHARE FACEBOOK 📘\n\n🧧 Free Credit RM68\n\n➤ CLICK /start TO BACK MENU" },
  "🔥 DAILY APPS FREE 🔥": { url: "https://afb88my1.com/promotion", media: "https://ibb.co/nsmVQFbg", caption: "🔥 DAILY APPS FREE 🔥\n\n🎁 Free Credit RM20\n\n➤ CLICK /start TO BACK MENU" },
  "🌞 SOCIAL MEDIA 🌞": { url: "https://afb88my1.com/promotion", media: "https://ibb.co/HfyD6DWw", caption: "🌞 SOCIAL MEDIA 🌞\n\n📌 FOLLOW SOCIAL MEDIA\n\n➤ CLICK /start TO BACK MENU!" },
  "🎉 TELEGRAM BONUS 🎉": { url: "https://afb88my1.com/promotion", media: "https://ibb.co/21qTqmtY", caption: "🎉 TELEGRAM BONUS 🎉\n\n🎁 SUBSCRIBE TELEGRAM BONUS\n\n➤ CLICK /start TO BACK MENU" },
};

bot.hears(Object.keys(menuData), async (ctx) => {
  try {
    if (!ctx.message || ctx.chat.type !== "private") return;

    const data = menuData[ctx.message.text];
    if (!data) return;

    const inlineBtn = Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]]);
    await ctx.replyWithPhoto(data.media, { caption: data.caption, ...inlineBtn });
  } catch (e) {
    console.error("❌ Error menu hears:", e);
  }
});

// ================== MANUAL /forward ==================
bot.command("forward", async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    if (userId !== ADMIN_USER_ID) return ctx.reply("❌ Anda bukan admin yang diizinkan!");
    if (chatId !== SOURCE_CHAT_ID) return ctx.reply("❌ Command hanya bisa digunakan di grup utama!");

    const replyTo = ctx.message.reply_to_message;
    if (!replyTo) return ctx.reply("❌ Reply ke pesan yang ingin di-forward.");

    const failed = [];

    for (const targetId of TARGET_CHAT_IDS) {
      try { await bot.telegram.forwardMessage(targetId, replyTo.chat.id, replyTo.message_id); } 
      catch (e) { console.error(e); failed.push(targetId); }
    }

    for (const subId of [...subscribers]) {
      try { await bot.telegram.forwardMessage(subId, replyTo.chat.id, replyTo.message_id); }
      catch (e) { subscribers = subscribers.filter(id => id !== subId); saveSubscribers(); }
    }

    if (failed.length) await ctx.reply(`❌ Gagal forward: ${failed.join(", ")}`);
  } catch (e) { console.error(e); try { await ctx.reply("❌ Terjadi error saat forward."); } catch {} }
});

// ================== AUTO REPOST DI GRUP UTAMA ==================
bot.on(["text","photo","video","animation"], async (ctx) => {
  try {
    if (ctx.chat.id !== SOURCE_CHAT_ID || ctx.from.id !== ADMIN_USER_ID) return;

    const repostButtons = Markup.inlineKeyboard([
      [Markup.button.url("🎮 Register", "https://afb88my1.com/register/SMSRegister"),
       Markup.button.url("🌐 Login", "https://afb88my1.com/")],
      [Markup.button.url("▶️ Join Channel 1", "t.me/afb88my"),
       Markup.button.url("▶️ Join Channel 2", "t.me/afb88casinomy")],
      [Markup.button.url("▶️ Group Sembang", "https://t.me/+b685QE242dMxOWE9"),
       Markup.button.url("🎁 Bonus Claim!", "https://afb88my1.com/promotion")],
    ]);

    try { await ctx.deleteMessage(); } catch {}

    if (ctx.message.photo) await ctx.replyWithPhoto(ctx.message.photo[0].file_id, { caption: ctx.message.caption || "", ...repostButtons });
    else if (ctx.message.video) await ctx.replyWithVideo(ctx.message.video.file_id, { caption: ctx.message.caption || "", ...repostButtons });
    else if (ctx.message.animation) await ctx.replyWithAnimation(ctx.message.animation.file_id, { caption: ctx.message.caption || "", ...repostButtons });
    else if (ctx.message.text) await ctx.reply(ctx.message.text, repostButtons);
  } catch (e) { console.error("❌ Error auto repost:", e); }
});

// ================== COMMAND /unsub ==================
bot.command("unsub", async (ctx) => {
  const userId = ctx.from.id;
  if (subscribers.includes(userId)) {
    subscribers = subscribers.filter(id => id !== userId);
    saveSubscribers();
    await ctx.reply("✅ Anda telah berhenti berlangganan. Klik /start jika ingin kembali.");
  } else {
    await ctx.reply("⚠️ Anda belum berlangganan.");
  }
});

// ================== START BOT ==================
bot.launch().then(() => console.log("🤖 Bot sudah jalan pakai Node.js (Telegraf)..."))
  .catch((e) => console.error("❌ Bot launch error:", e));

// ================== GRACEFUL STOP ==================
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// ================== KEEP ALIVE SERVER ==================
const app = express();
const PORT = process.env.PORT || 10000;
app.get("/", (req, res) => res.send("🤖 Bot Telegram sedang berjalan..."));
app.listen(PORT, () => console.log(`🌐 Keep-alive server jalan di port ${PORT}`));
