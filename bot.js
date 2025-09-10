import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const ADMIN_USER_ID = 1087968824;
const SOURCE_CHAT_ID = -1003038090571;
const TARGET_CHAT_IDS = [-1002967257984, -1002996882426];

const bot = new Telegraf(BOT_TOKEN);

// ================== START & MENU ==================
bot.start(async (ctx) => {
  const user = ctx.from;
  const username = user.username ? `@${user.username}` : user.first_name;

  // Tombol inline utama
  const inlineButtons = Markup.inlineKeyboard([
    [Markup.button.url("📢 SUBSCRIBE CHANNEL", "https://t.me/afb88my")],
    [Markup.button.url("💬 GROUP CUCI & TIPS GAME", "https://t.me/+b685QE242dMxOWE9")],
    [Markup.button.url("🌐 REGISTER & LOGIN", "https://afb88my1.com/")],
    [Markup.button.url("🔞 AMOI VIDEO", "https://t.me/Xamoi2688")],
  ]);

  // Menu permanen (reply keyboard)
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
    ...inlineButtons,
  });

  await ctx.reply("➤ CLICK /start TO BACK MENU:", replyKeyboard);
});

// ================== REPLY MENU ==================
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
  const data = menuData[ctx.message.text];
  const inlineBtn = Markup.inlineKeyboard([
    [Markup.button.url("CLAIM 🎁", data.url)],
  ]);

  await ctx.replyWithPhoto(data.media, {
    caption: data.caption,
    ...inlineBtn,
  });
});

// ================== AUTO REPOST (HANYA ADMIN DI GRUP) ==================
bot.on(["text", "photo", "video", "animation"], async (ctx) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  if (chatId === SOURCE_CHAT_ID && userId === ADMIN_USER_ID) {
    const repostButtons = Markup.inlineKeyboard([
      [Markup.button.url("🎮 Register", "https://afb88my1.com/register/SMSRegister"),
       Markup.button.url("🌐 Login", "https://afb88my1.com/")],
      [Markup.button.url("▶️ Join Channel 1", "t.me/afb88my"),
       Markup.button.url("▶️ Join Channel 2", "t.me/afb88casinomy")],
      [Markup.button.url("▶️ Group Sembang", "https://t.me/+b685QE242dMxOWE9"),
       Markup.button.url("🎁 Bonus Claim!", "https://afb88my1.com/promotion")],
      [Markup.button.url("📱 Facebook", "https://www.facebook.com/profile.php?id=61579884569151"),
       Markup.button.url("📱 FB Group", "https://www.facebook.com/groups/772875495480578")],
      [Markup.button.url("📞 WhatsApp", "https://wa.me/+601133433880"),
       Markup.button.url("🔞 Amoi Video", "https://t.me/Xamoi2688")],
      [Markup.button.url("🔗 Link Syok", "https://heylink.me/AFB88casino"),
       Markup.button.url("🤖 BOT AFB88", "https://t.me/afb88_bot")],
    ]);

    try {
      await ctx.deleteMessage();

      if (ctx.message.photo) {
        await ctx.replyWithPhoto(ctx.message.photo[0].file_id, {
          caption: ctx.message.caption || "",
          ...repostButtons,
        });
      } else if (ctx.message.video) {
        await ctx.replyWithVideo(ctx.message.video.file_id, {
          caption: ctx.message.caption || "",
          ...repostButtons,
        });
      } else if (ctx.message.animation) {
        await ctx.replyWithAnimation(ctx.message.animation.file_id, {
          caption: ctx.message.caption || "",
          ...repostButtons,
        });
      } else if (ctx.message.text) {
        await ctx.reply(ctx.message.text, repostButtons);
      }
    } catch (e) {
      console.error("Error auto_repost:", e);
    }
  }
});

// ================== START BOT ==================
bot.launch();
console.log("🤖 Bot sudah jalan pakai Node.js (Telegraf)...");
