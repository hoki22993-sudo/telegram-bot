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
const TARGET_CHAT_IDS = [
  -1003175423118,
  -1003443785953
]; // ❗ JANGAN letak SOURCE_CHAT_ID di sini

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

// ================= START =================
async function sendStart(ctx) {
  const user = ctx.from || {};
  const username = user.username
    ? `@${user.username}`
    : user.first_name || "Bossku";

  if (user.id && !subscribers.includes(user.id)) {
    subscribers.push(user.id);
    saveSubscribers();
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

// ================== REPLY MENU (PRIVATE chat) ==================
const menuData = {
  "🌟 NEW REGISTER FREE 🌟": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/BK2LVQ6t",
    caption: `🌟 NEW REGISTER BONUS 🌟

⚠️ LANGGAR SYARAT AKAN FORFEITED SEMUA POINT ⚠️

✅ Keperluan SLOT ONLY

✅ Free Credit RM88  
✅ Min WD/CUCI RM2000  
✅ Max Payment/WD RM40  
✅ BELOW CREDIT RM 0.10 
✅ Dibenarkan Main MEGAH5|EPICWIN|PXPLAY2|ACEWIN2|RICH GAMING ( EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM MESTI DOWNLOAD APPS UNTUK CLAIM CLICK LINK: https://afb88.hfcapital.top/

⚠️ 1 NAMA 1 ID SAHAJA,TIDAK BOLEH  
GUNA NAMA YANG SAMA UNTUK TUNTUT  
BONUS INI 
⚠️ NAMA DAFTAR MESTI SAMA DENGAN NAMA AKAUN BANK  
AKAUN BANK TIDAK BOLEH DIUBAH SELEPAS DAFTAR 

➤ CLICK /start TO BACK MENU`,
  },
  "📘 SHARE FACEBOOK 📘": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/Z6B55VcX",
    caption: `📘 SHARE FACEBOOK 📘

🧧 FREE CREDIT RM68 🧧  

✅ STEP 1: Join Our Telegram Channel LINK JOIN:t.me/afb88my
✅ STEP 2: Join Our Facebook Group LINK JOIN: https://www.facebook.com/share/g/1GGcZKo6zN/
➡️ How To Claim Free Credit: Share Post To 5 Casino Group 3 Link
➡️ Had Tuntutan : DAILY CLAIM X1
✅ Dibenarkan Main : MEGAH5|EPICWIN|PXPLAY|ACEWIN2|RICH GAMING (EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM MESTI DOWNLOAD APPS UNTUK CLAIM CLICK LINK: https://afb88.hfcapital.top/
️ 1 NAMA 1 ID SAHAJA,TIDAK BOLEH  
GUNA NAMA YANG SAMA UNTUK TUNTUT  
BONUS INI 
⚠️ NAMA DAFTAR MESTI SAMA DENGAN NAMA AKAUN BANK  
AKAUN BANK TIDAK BOLEH DIUBAH SELEPAS DAFTAR 

➤ CLICK /start TO BACK MENU`,
  },
  "🔥 DAILY APPS FREE 🔥": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/nsmVQFbg",
    caption: `🔥 DAILY APPS FREE 🔥

🎁 Free Credit RM20 

📌 Had Tuntutan Daily Claim X1
💰 Min. Withdraw RM 600  
💳 Max. Payment RM 10  
💰 Below Credit RM 0.10
✅ Dibenarkan Main : MEGAH5|EPICWIN|PXPLAY|ACEWIN2|RICH GAMING (EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM MESTI DOWNLOAD APPS UNTUK CLAIM CLICK LINK: https://afb88.hfcapital.top/

⚠️ XDAPAT REKOMEN SENDIRI,BANK ACCOUNT/NAMA INFO SALAH AKAN FORFEITED SEMUA POINT 

➤ CLICK /start TO BACK MENU`,
  },
  "🌞 SOCIAL MEDIA 🌞": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/HfyD6DWw",
    caption: `🌞 SOCIAL MEDIA 🌞

📌FOLLOW SOCIAL MEDIA:  

📘 Facebook: https://www.facebook.com/profile.php?id=61579884569151  
📸 Instagram: https://instagram.com/afb88  
🎥 WhatsApp Group: https://wa.me/+601133433880

🎯 Dapatkan maklumat acara terkini, bonus dan kemas kini 

➤ CLICK /start TO BACK MENU!`,
  },
  "🎉 TELEGRAM BONUS 🎉": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/21qTqmtY",
    caption: `🎉 TELEGRAM BONUS 🎉

🎁 SUBSCRIBE TELEGRAM BONUS:  
✅ Free Credit RM 30
✅ Had Tuntutan X1
✅ Min.Withdraw RM 888
✅ Max.Payment RM 15
✅ Join Telegram Channel :https://t.me/afb88my
❌ TIDAK BOLEH DIGABUNG: TOP UP/REBATE/FREE/CREDIT/COMMISION BONUS

👉 CLICK CLAIM NOW 

➤ CLICK /start TO BACK MENU`,
  },
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

// ================= /forward =================
bot.command("forward", async (ctx) => {
  if (ctx.from.id !== ADMIN_USER_ID) return;
  if (ctx.chat.id !== SOURCE_CHAT_ID) return;

  const replyTo = ctx.message.reply_to_message;
  if (!replyTo) return;

  // forward ke group target (TIDAK termasuk group asal)
  for (const targetId of TARGET_CHAT_IDS) {
    if (targetId === SOURCE_CHAT_ID) continue;

    try {
      await bot.telegram.forwardMessage(
        targetId,
        replyTo.chat.id,
        replyTo.message_id,
        { disable_notification: true }
      );
    } catch {}
  }

  // forward ke subscriber
  for (const subId of [...subscribers]) {
    try {
      await bot.telegram.forwardMessage(
        subId,
        replyTo.chat.id,
        replyTo.message_id,
        { disable_notification: true }
      );
    } catch {
      subscribers = subscribers.filter((id) => id !== subId);
      saveSubscribers();
    }
  }

  // ❌ TIADA mesej berjaya
});

// ================= AUTO INLINE (DELETE + REPOST) =================
bot.on(["text", "photo", "video", "animation"], async (ctx) => {
  if (ctx.chat.id !== SOURCE_CHAT_ID) return;
  if (ctx.from.id !== ADMIN_USER_ID) return;

  const buttons = Markup.inlineKeyboard([
    [
      Markup.button.url("🎮 Register", "https://afb88my1.com/register/SMSRegister"),
      Markup.button.url("🌐 Login", "https://afb88my1.com/")
    ],
    [
      Markup.button.url("▶️ Channel", "https://t.me/afb88my"),
      Markup.button.url("🎁 Bonus", "https://afb88my1.com/promotion")
    ]
  ]);

  try { await ctx.deleteMessage(); } catch {}

  if (ctx.message.photo) {
    await ctx.replyWithPhoto(ctx.message.photo.at(-1).file_id, {
      caption: ctx.message.caption || "",
      ...buttons
    });
  } else if (ctx.message.video) {
    await ctx.replyWithVideo(ctx.message.video.file_id, {
      caption: ctx.message.caption || "",
      ...buttons
    });
  } else if (ctx.message.animation) {
    await ctx.replyWithAnimation(ctx.message.animation.file_id, {
      caption: ctx.message.caption || "",
      ...buttons
    });
  } else if (ctx.message.text) {
    await ctx.reply(ctx.message.text, buttons);
  }
});

// ================= /unsub =================
bot.command("unsub", async (ctx) => {
  subscribers = subscribers.filter((id) => id !== ctx.from.id);
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

