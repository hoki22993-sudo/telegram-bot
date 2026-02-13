// bot.js (versi lengkap, anti-link + MongoDB subscriber)
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import express from "express";

dotenv.config();

// ================= KONFIGURASI ASAS =================
const BOT_TOKEN = process.env.BOT_TOKEN || "ISI_TOKEN_DI_SINI";
const ADMIN_USER_ID = 8146896736; // ID admin (akaun telegram anda)
const PORT = parseInt(process.env.PORT || "8080", 10);
// Wajib isi di .env: MONGODB_URI=mongodb+srv://botuser:PASSWORD@cluster0.uxxklgz.mongodb.net/botdb?retryWrites=true&w=majority
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

// ===== ID GROUP & CHANNEL =====
const SOURCE_CHAT_ID = -1002626291566; // GROUP UTAMA (tempat anda guna /forward)

const TARGET_CHAT_IDS = [
  // ===== GROUP LAIN =====
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

  // ===== CHANNEL =====
  -1003175423118,
  -1003418215358,
  -1003410432304,
  -1003390131591,
  -1003379058057
];

const AUTO_DELETE_DELAY = 5000; // ms – auto delete mesej bot di group utama

// Tetapan siaran ke subscriber
const SUB_BATCH_SIZE = 20;            // hantar serentak ke 20 orang per batch
const SUB_DELAY_BETWEEN_BATCH = 1000; // jeda 1 saat antara batch

// Tetapan anti-spam
const ENABLE_LINK_ANTISPAM = true; // true = blok link dari bukan admin di semua group

// Senarai kata/frasa yang di-ban (semua dalam huruf kecil)
const BANNED_WORDS = [
  "promo luar",
  "free kredit luar",
  "bonus 100%",
  "kencing",
  "anjing"
].map((w) => w.toLowerCase());

// ===== SEMAK BOT_TOKEN =====
if (!BOT_TOKEN || BOT_TOKEN === "ISI_TOKEN_DI_SINI") {
  console.error(
    "[STARTUP] ❌ BOT_TOKEN kosong / masih 'ISI_TOKEN_DI_SINI'. " +
      "Sila isi env BOT_TOKEN dahulu."
  );
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Tangkap error telegraf supaya mudah debug
bot.catch((err, ctx) => {
  console.error("[TELEGRAF] Ralat pada update:", err.message, "update:", ctx.update);
});

// ================= MONGODB – SUBSCRIBER PERSISTENT =================
let mongoClient = null;
let subscribersCollection = null;
const DB_NAME = "botdb";
const SUBSCRIBERS_COLLECTION = "subscribers";

async function connectMongo() {
  if (!MONGODB_URI) {
    console.error(
      "[MONGODB] ❌ MONGODB_URI kosong. Sila isi dalam .env:\n" +
        "MONGODB_URI=mongodb+srv://botuser:PASSWORD@cluster0.uxxklgz.mongodb.net/botdb?retryWrites=true&w=majority"
    );
    return false;
  }
  const maxRetries = 3;
  const retryDelayMs = 2000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log("[MONGODB] Sambung... percubaan", attempt, "/", maxRetries);
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      const db = mongoClient.db(DB_NAME);
      subscribersCollection = db.collection(SUBSCRIBERS_COLLECTION);
      await subscribersCollection.createIndex({ userId: 1 }, { unique: true });
      console.log("[MONGODB] ✅ Konek langsung ke MongoDB — koleksi:", SUBSCRIBERS_COLLECTION);
      return true;
    } catch (err) {
      console.error("[MONGODB] Percubaan", attempt, "gagal:", err.message);
      if (mongoClient) {
        try {
          await mongoClient.close();
        } catch {}
        mongoClient = null;
        subscribersCollection = null;
      }
      if (attempt < maxRetries) {
        console.log("[MONGODB] Cuba lagi dalam", retryDelayMs / 1000, "saat...");
        await new Promise((r) => setTimeout(r, retryDelayMs));
      } else {
        console.error(
          "[MONGODB] ❌ Gagal selepas",
          maxRetries,
          "percubaan. Sila semak MONGODB_URI dan Network Access di Atlas."
        );
        return false;
      }
    }
  }
  return false;
}

async function addSubscriber(userId) {
  if (!subscribersCollection) return false;
  try {
    await subscribersCollection.updateOne(
      { userId },
      { $set: { userId, updatedAt: new Date() } },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error("[MONGODB] addSubscriber ralat:", err.message);
    return false;
  }
}

async function removeSubscriber(userId) {
  if (!subscribersCollection) return false;
  try {
    await subscribersCollection.deleteOne({ userId });
    return true;
  } catch (err) {
    console.error("[MONGODB] removeSubscriber ralat:", err.message);
    return false;
  }
}

async function getAllSubscribers() {
  if (!subscribersCollection) return [];
  try {
    const cursor = subscribersCollection.find({}, { projection: { userId: 1, _id: 0 } });
    const list = await cursor.toArray();
    return list.map((doc) => doc.userId);
  } catch (err) {
    console.error("[MONGODB] getAllSubscribers ralat:", err.message);
    return [];
  }
}

async function removeSubscribersByIds(userIds) {
  if (!subscribersCollection || !userIds.length) return;
  try {
    await subscribersCollection.deleteMany({ userId: { $in: [...userIds] } });
  } catch (err) {
    console.error("[MONGODB] removeSubscribersByIds ralat:", err.message);
  }
}

// Helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ================= EXPRESS (HEALTH CHECK) =================
const app = express();
app.get("/", (_, res) => res.send("🤖 Bot sedang berjalan"));
app.get("/health", (_, res) =>
  res.json({
    status: "ok",
    bot: "running",
    mongodb: subscribersCollection ? "connected" : "disconnected"
  })
);

// ================= /start & MENU UTAMA =================
async function sendStart(ctx) {
  const user = ctx.from || {};
  const username = user.username ? `@${user.username}` : user.first_name || "Bossku";

  // Daftar subscriber (simpan ke MongoDB)
  if (user.id) {
    const added = await addSubscriber(user.id);
    if (added) {
      try {
        await bot.telegram.sendMessage(
          ADMIN_USER_ID,
          `📌 Subscriber baru: ${username} (${user.id})`
        );
      } catch {}
    }
  }

  const inlineButtons = Markup.inlineKeyboard([
    [Markup.button.url("📢 CHANNEL UTAMA", "https://t.me/afb88my")],
    [Markup.button.url("💬 GROUP CUCI & TIPS GAME", "https://t.me/+b685QE242dMxOWE9")],
    [Markup.button.url("🌐 REGISTER & LOGIN", "https://afb88my1.com/")],
    [Markup.button.url("🎁 GROUP HADIAH AFB88", "https://t.me/Xamoi2688")]
  ]);

  const replyKeyboard = Markup.keyboard([
    ["🌟 STEP CUCI FREE TEKAN SINI 🌟"],
    ["📘 SHARE FACEBOOK 📘"],
    ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
    ["🎉 TELEGRAM BONUS 🎉"]
  ]).resize();

  await ctx.replyWithAnimation(
    "https://media3.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif",
    {
      caption: `👋 Hi ${username} Bossku 😘
Kalau sudah join semua channel & group, amoi akan cuba bagi info paling untung untuk anda ❤️

📌 Sila tekan butang di bawah untuk lihat promo-promo yang ada.`,
      ...inlineButtons
    }
  );

  await ctx.reply("➤ Tekan /start bila-bila masa untuk kembali ke menu utama.", replyKeyboard);
}

bot.start(sendStart);
bot.command(["menu", "help", "about", "profile", "contact"], sendStart);

// ================= DATA MENU PRIVATE =================
const menuData = {
  "🌟 STEP CUCI FREE TEKAN SINI 🌟": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/BK2LVQ6t",
    caption: `🌟 NEW REGISTER BONUS AFB88 🌟
Hallo bossku, Ini langkah- langkah step Untuk "CUCI BONUS" Sila baca dengan teliti ya 😊🙏
✅ 1️⃣. ➡️ Join our Telegram channel ⬇️
https://t.me/+NQBQYnGkNUU5YmNl
✅ 2️⃣.  ➡️Join our Facebook group ⬇️
 https://www.facebook.com/profile.php?id=61579884569151
✅ 3️⃣. ➡️Share post ke 5 Casino Group ⬇️
https://web.facebook.com/share/p/17r4JJ5JJV/
✅ 3️⃣. ➡️Share post ke 5 Casino Group ⬇️
https://web.facebook.com/share/p/17r4JJ5JJV/
✅ 4️⃣. ➡️Join Facebook group Group ⬇️
https://web.facebook.com/groups/772875495480578
✅ Lepastu send kat livechat atau telegram 1 by 1 ya boss thankyou 🤗
➤ Tekan /start untuk kembali ke menu`

  },
  "📘 SHARE FACEBOOK 📘": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/Z6B55VcX",
    caption: `📘 PROMO SHARE FACEBOOK 📘
🧧 Free Credit RM68 🧧

Syarat:
✅ Join Telegram Channel
✅ Join Facebook Group
➡️ Share ke 5 group casino
➡️ Daily claim 1x sehari

➤ Tekan /start untuk kembali ke menu`
  },
  "🔥 DAILY APPS FREE 🔥": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/nsmVQFbg",
    caption: `🔥 DAILY APPS FREE 🔥
🎁 Free Credit RM20
📌 Daily claim 1x
💰 Min WD RM600

➤ Tekan /start untuk kembali ke menu`
  },
  "🌞 SOCIAL MEDIA 🌞": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/HfyD6DWw",
    caption: `🌞 SOCIAL MEDIA OFFICIAL AFB88 🌞
📘 Facebook
📸 Instagram
🎥 WhatsApp Group

➤ Tekan /start untuk kembali ke menu`
  },
  "🎉 TELEGRAM BONUS 🎉": {
    url: "https://afb88my1.com/promotion",
    media: "https://ibb.co/21qTqmtY",
    caption: `🎉 TELEGRAM BONUS KHAS 🎉
🎁 Free Credit RM30
✅ Claim 1x

➤ Tekan /start untuk kembali ke menu`
  }
};

bot.hears(Object.keys(menuData), async (ctx) => {
  if (ctx.chat?.type !== "private") return;

  const data = menuData[ctx.message?.text];
  if (!data) return;

  try {
    await ctx.replyWithPhoto(data.media, {
      caption: data.caption,
      ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
    });
  } catch (err) {
    console.error("Ralat hantar foto:", err.message);
    await ctx.reply(data.caption + `\n\n🔗 ${data.url}`, {
      ...Markup.inlineKeyboard([[Markup.button.url("CLAIM 🎁", data.url)]])
    });
  }
});

// ================= /unsub (berhenti langganan) =================
bot.command("unsub", async (ctx) => {
  if (!ctx.from) return;
  await removeSubscriber(ctx.from.id);
  await ctx.reply("✅ Anda telah berhenti langganan siaran dari bot ini.");
});

// ================= BANTUAN SIARAN / BROADCAST =================
let isBroadcastRunning = false;

// Forward ke group & channel target (bukan group utama)
async function broadcastToTargets(replyTo) {
  for (const targetId of TARGET_CHAT_IDS) {
    if (targetId === SOURCE_CHAT_ID) continue;

    try {
      await bot.telegram.forwardMessage(
        targetId,
        replyTo.chat.id,
        replyTo.message_id,
        { disable_notification: true }
      );
    } catch (err) {
      console.error("Ralat forward ke target", targetId, ":", err.message);
      try {
        await bot.telegram.sendMessage(ADMIN_USER_ID, `❌ Ralat forward ke ${targetId}`);
      } catch {}
    }
  }
}

// Forward ke semua subscriber (baca dari MongoDB)
async function broadcastToSubscribers(replyTo) {
  const subscribers = await getAllSubscribers();
  if (!subscribers.length) return;

  const invalidIds = new Set();

  console.log(
    `[BROADCAST] Mula hantar ke ${subscribers.length} subscriber ` +
      `(batch=${SUB_BATCH_SIZE}, delay=${SUB_DELAY_BETWEEN_BATCH}ms)`
  );

  for (let i = 0; i < subscribers.length; i += SUB_BATCH_SIZE) {
    const batch = subscribers.slice(i, i + SUB_BATCH_SIZE);

    await Promise.all(
      batch.map(async (subId) => {
        try {
          await bot.telegram.forwardMessage(
            subId,
            replyTo.chat.id,
            replyTo.message_id,
            { disable_notification: true }
          );
        } catch (err) {
          console.error(
            "Ralat forward ke subscriber",
            subId,
            ":",
            err.description || err.message
          );

          const code = err?.response?.error_code;
          if (code === 400 || code === 403) {
            invalidIds.add(subId);
          }
        }
      })
    );

    if (i + SUB_BATCH_SIZE < subscribers.length) {
      await sleep(SUB_DELAY_BETWEEN_BATCH);
    }
  }

  if (invalidIds.size > 0) {
    await removeSubscribersByIds([...invalidIds]);
    console.log(`[BROADCAST] Buang ${invalidIds.size} subscriber tidak sah / block bot`);
  }

  console.log("[BROADCAST] Selesai hantar ke semua subscriber");
}

// ================= /forward (untuk admin di group utama) =================
bot.command("forward", async (ctx) => {
  if (!ctx.from || ctx.from.id !== ADMIN_USER_ID) return;
  if (ctx.chat?.id !== SOURCE_CHAT_ID) return;

  const replyTo = ctx.message?.reply_to_message;
  if (!replyTo) {
    await ctx.reply(
      "❗ Sila guna /forward sebagai *reply* kepada mesej yang ingin dihantar.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  if (isBroadcastRunning) {
    await ctx.reply("⏳ Siaran sebelum ini masih berjalan, sila tunggu sehingga selesai.");
    return;
  }

  isBroadcastRunning = true;
  const totalSubs = (await getAllSubscribers()).length;

  try {
    await ctx.reply(`🚀 Mula forward ke group/channel sasaran & ${totalSubs} subscriber...`);

    await broadcastToTargets(replyTo);
    await broadcastToSubscribers(replyTo);

    await ctx.reply("✅ Forward selesai, semua sasaran telah diproses.");
  } catch (err) {
    console.error("[BROADCAST] Ralat umum:", err);
    try {
      await ctx.reply("❌ Berlaku ralat ketika forward, sila semak log.");
    } catch {}
  } finally {
    isBroadcastRunning = false;
    try {
      await ctx.deleteMessage();
    } catch {}
  }
});

// ================= MODERASI: LINK & KATA TERLARANG DI SEMUA GROUP =================
async function handleModeration(ctx) {
  if (!ENABLE_LINK_ANTISPAM) return;
  if (!ctx.chat) return;

  const chatType = ctx.chat.type;
  if (chatType !== "group" && chatType !== "supergroup") return;

  if (!ctx.from) return;

  const msg = ctx.message;
  if (!msg) return;

  const text = (msg.text || msg.caption || "").toString();
  const textLower = text.toLowerCase();
  const entities = msg.entities || msg.caption_entities || [];

  console.log(
    "[MOD] Dapat pesan di chat",
    ctx.chat.id,
    "dari",
    ctx.from.id,
    "type",
    chatType,
    "text:",
    text
  );

  let hasLink = false;

  if (entities && entities.length) {
    if (entities.some((e) => e.type === "url" || e.type === "text_link")) {
      hasLink = true;
    }
  }
  if (!hasLink && /https?:\/\/|www\.|t\.me\//i.test(text)) {
    hasLink = true;
  }

  const hasBannedWord = BANNED_WORDS.some((w) => w && textLower.includes(w));

  console.log("[MOD] hasLink =", hasLink, "hasBannedWord =", hasBannedWord);

  if (!hasLink && !hasBannedWord) return;

  let isAdmin = false;
  try {
    const member = await ctx.getChatMember(ctx.from.id);
    console.log("[MOD] Status member:", member.status);
    if (member.status === "administrator" || member.status === "creator") {
      isAdmin = true;
    }
  } catch (err) {
    console.error("Gagal semak status ahli:", err.message);
  }

  if (isAdmin) {
    console.log("[MOD] Pesan ada link/kata ban tapi dari admin, dibiarkan.");
    return;
  }

  try {
    await ctx.deleteMessage();
    console.log("[MOD] Berjaya padam pesan spam.");
  } catch (err) {
    console.error("Gagal padam mesej melanggar peraturan:", err.message);
  }

  try {
    const warn = await ctx.reply(
      "⚠️ Mesej anda melanggar peraturan group (link luar / kata yang tidak dibenarkan). " +
        "Hanya admin dibenarkan kongsi link atau promo luar."
    );
    setTimeout(() => {
      bot.telegram.deleteMessage(warn.chat.id, warn.message_id).catch(() => {});
    }, 5000);
  } catch {}
}

bot.on("message", async (ctx) => {
  try {
    await handleModeration(ctx);
  } catch (err) {
    console.error("Ralat di handleModeration:", err.message);
  }

  const botId = bot.botInfo?.id;
  if (!botId) return;
  if (ctx.chat?.id === SOURCE_CHAT_ID && ctx.from?.id === botId) {
    const chatId = ctx.chat.id;
    const msgId = ctx.message?.message_id;
    if (chatId && msgId) {
      setTimeout(() => {
        bot.telegram.deleteMessage(chatId, msgId).catch(() => {});
      }, AUTO_DELETE_DELAY);
    }
  }
});

// ================= STARTUP =================
async function main() {
  console.log(
    "[STARTUP] PORT=" +
      PORT +
      ", BOT_TOKEN=" +
      (BOT_TOKEN ? "***ada***" : "KOSONG!") +
      ", MONGODB_URI=" +
      (MONGODB_URI ? "***ada***" : "KOSONG")
  );

  const mongoOk = await connectMongo();
  if (!mongoOk) {
    console.error(
      "[STARTUP] ❌ Bot memerlukan MongoDB. Isi MONGODB_URI dalam .env dan pastikan Atlas Network Access dibenarkan."
    );
    process.exit(1);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log("[STARTUP] ✅ Server sedang mendengar pada port " + PORT);
  });

  server.on("error", (err) => {
    console.error("[STARTUP] ❌ Ralat Express:", err.message);
    process.exit(1);
  });

  try {
    const me = await bot.telegram.getMe();
    console.log(
      "[STARTUP] ✅ Bot berjaya sambung sebagai @" + me.username + " (id=" + me.id + ")"
    );
  } catch (err) {
    console.error(
      "[STARTUP] ❌ Gagal sambung ke Telegram. Kemungkinan besar BOT_TOKEN salah / bot telah dipadam."
    );
    console.error("[STARTUP] Butiran ralat:", err.message);
    return;
  }

  try {
    await bot.launch();
    console.log("[STARTUP] ✅ Bot Telegram sedang berjalan");
  } catch (err) {
    console.error("[STARTUP] ❌ Gagal mula bot:", err.message);
  }

  const stop = async () => {
    try {
      bot.stop("SIGTERM");
    } catch {}
    if (mongoClient) {
      try {
        await mongoClient.close();
      } catch {}
    }
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main().catch((err) => {
  console.error("[STARTUP] ❌ Ralat fatal:", err);
  process.exit(1);
});
