import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";
dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID);
const SOURCE_CHAT_ID = Number(process.env.SOURCE_CHAT_ID);
const TARGET_CHAT_IDS = (process.env.TARGET_CHAT_IDS || "")
  .split(",")
  .map(id => Number(id))
  .filter(id => id && id !== SOURCE_CHAT_ID);
const DOMAIN = process.env.DOMAIN;
const PORT = process.env.PORT || 10000;
const AUTO_DELETE_DELAY = 5000;

const bot = new Telegraf(BOT_TOKEN);
let botInfo = null;

// ================= BOT INFO =================
bot.telegram.getMe()
  .then(info => { botInfo = info; console.log("✅ Bot ready:", info.username); })
  .catch(err => { console.error("❌ Gagal ambil bot info:", err); process.exit(1); });

// ================= SUBSCRIBERS =================
const SUBSCRIBERS_FILE = "subscribers.json";
let subscribers = [];

try {
  if (fs.existsSync(SUBSCRIBERS_FILE)) {
    subscribers = JSON.parse(fs.readFileSync(SUBSCRIBERS_FILE, "utf8") || "[]");
    if (!Array.isArray(subscribers)) subscribers = [];
  }
} catch { subscribers = []; }

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
    try { await bot.telegram.sendMessage(ADMIN_USER_ID, `📌 Subscriber baru: ${username} (${user.id})`); } catch {}
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
    { caption: `👋 Hi ${username}\nBossku 😘\nKalau sudah subscribe, amoi pasti kasi untung terbaik ❤️\nSila join semua group dulu ya`, ...inlineButtons }
  );

  await ctx.reply("➤ CLICK /start TO BACK MENU", replyKeyboard);
}

bot.start(sendStart);
bot.command(["menu","help","about","profile","contact"], sendStart);

// ================= MENU DATA =================
const menuData = {
  "🌟 NEW REGISTER FREE 🌟": { url:"https://afb88my1.com/promotion", media:"https://ibb.co/BK2LVQ6t", caption:"🌟 NEW REGISTER BONUS 🌟 ..." },
  "📘 SHARE FACEBOOK 📘": { url:"https://afb88my1.com/promotion", media:"https://ibb.co/Z6B55VcX", caption:"📘 SHARE FACEBOOK 📘 ..." },
  "🔥 DAILY APPS FREE 🔥": { url:"https://afb88my1.com/promotion", media:"https://ibb.co/nsmVQFbg", caption:"🔥 DAILY APPS FREE 🔥 ..." },
  "🌞 SOCIAL MEDIA 🌞": { url:"https://afb88my1.com/promotion", media:"https://ibb.co/HfyD6DWw", caption:"🌞 SOCIAL MEDIA 🌞 ..." },
  "🎉 TELEGRAM BONUS 🎉": { url:"https://afb88my1.com/promotion", media:"https://ibb.co/21qTqmtY", caption:"🎉 TELEGRAM BONUS 🎉 ..." }
};

bot.hears(Object.keys(menuData), async ctx => {
  if (ctx.chat.type !== "private") return;
  const data = menuData[ctx.message.text];
  if (!data) return;
  await ctx.replyWithPhoto(data.media, { caption: data.caption, ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]]) });
});

// ================= /forward COMMAND =================
bot.command("forward", async ctx => {
  if (ctx.from.id !== ADMIN_USER_ID) return;
  if (ctx.chat.id !== SOURCE_CHAT_ID) return;

  const replyTo = ctx.message.reply_to_message;
  if (!replyTo) return;

  for (const targetId of TARGET_CHAT_IDS) {
    try { await bot.telegram.forwardMessage(targetId, replyTo.chat.id, replyTo.message_id, { disable_notification:true }); }
    catch(err){ console.error(err); try{ await bot.telegram.sendMessage(ADMIN_USER_ID, `❌ Error forward ke group ${targetId}: ${err}`); } catch{} }
  }

  for(let i=0;i<subscribers.length;i++){
    const subId = subscribers[i];
    try{
      await bot.telegram.forwardMessage(subId, replyTo.chat.id, replyTo.message_id, {disable_notification:true});
      await new Promise(r=>setTimeout(r,500+Math.random()*300));
    } catch(err){
      subscribers = subscribers.filter(id=>id!==subId); saveSubscribers();
      console.log(`❌ Subscriber ${subId} dihapus:`, err.message||err);
      try{ await bot.telegram.sendMessage(ADMIN_USER_ID, `⚠️ Subscriber ${subId} dihapus karena error forward`); } catch{}
    }
  }

  try{ await ctx.deleteMessage(); } catch{}
});

// ================= /unsub =================
bot.command("unsub", async ctx=>{
  subscribers = subscribers.filter(id=>id!==ctx.from.id); saveSubscribers();
  await ctx.reply("✅ Anda telah berhenti langganan.");
});

// ================= AUTO DELETE PESAN BOT DI GROUP =================
bot.on("message", async ctx=>{
  if(ctx.chat.id===SOURCE_CHAT_ID && ctx.from?.id===botInfo?.id){
    setTimeout(async ()=>{try{await ctx.deleteMessage()}catch{}}, AUTO_DELETE_DELAY);
  }
});

// ================= EXPRESS + WEBHOOK =================
const app = express();
const WEBHOOK_PATH = `/bot${BOT_TOKEN}`;
bot.telegram.setWebhook(`${DOMAIN}${WEBHOOK_PATH}`);
app.use(bot.webhookCallback(WEBHOOK_PATH));

app.get("/", (_, res)=>res.send("🤖 Bot berjalan di Choreo"));
app.listen(PORT, ()=>console.log(`Server listening on port ${PORT}`));

// ================= ERROR HANDLING =================
bot.catch((err, ctx)=>{ console.error("❌ Bot error:", err); });
