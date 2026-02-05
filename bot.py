# ================= IMPORT =================
import os
import time
import random
import threading
from flask import Flask
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters
)

# ================= CONFIG =================
# ⚠️ BOT_TOKEN langsung dari environment Choreo.dev, jangan pakai .env
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN environment variable not found! Pastikan sudah set di Choreo.")

ADMIN_USER_ID = 8146896736
SOURCE_CHAT_ID = -1002626291566
TARGET_CHAT_IDS = [-1003175423118, -1003443785953]
AUTO_DELETE_DELAY = 2  # detik

# ================= SUBSCRIBERS (in-memory) =================
subscribers = set()

# ================= MENU DATA =================
menu_data = {
    "🌟 NEW REGISTER FREE 🌟": {
        "url": "https://afb88.hfcapital.top/",
        "media": "https://i.ibb.co/BK2LVQ6t/image.png",
        "caption": "🌟 NEW REGISTER BONUS 🌟\n⚠️ 1 NAMA 1 ID SAHAJA..."
    },
    "📘 SHARE FACEBOOK 📘": {
        "url": "https://afb88.hfcapital.top/",
        "media": "https://i.ibb.co/Z6B55VcX/image.png",
        "caption": "📘 SHARE FACEBOOK 📘\n🧧 FREE CREDIT RM68..."
    },
    "🔥 DAILY APPS FREE 🔥": {
        "url": "https://afb88.hfcapital.top/",
        "media": "https://i.ibb.co/nsmVQFbg/image.png",
        "caption": "🔥 DAILY APPS FREE 🔥\n🎁 Free Credit RM20..."
    },
    "🌞 SOCIAL MEDIA 🌞": {
        "url": "https://afb88.hfcapital.top/",
        "media": "https://i.ibb.co/HfyD6DWw/image.png",
        "caption": "🌞 SOCIAL MEDIA 🌞\n📌FOLLOW SOCIAL MEDIA..."
    },
    "🎉 TELEGRAM BONUS 🎉": {
        "url": "https://afb88.hfcapital.top/",
        "media": "https://i.ibb.co/21qTqmtY/image.png",
        "caption": "🎉 TELEGRAM BONUS 🎉\n🎁 SUBSCRIBE TELEGRAM BONUS..."
    }
}

# ================= HELPER FUNCTIONS =================
async def add_subscriber(user_id: int, username: str, app):
    if user_id not in subscribers:
        subscribers.add(user_id)
        try:
            await app.bot.send_message(
                chat_id=ADMIN_USER_ID,
                text=f"📌 Subscriber baru: {username} ({user_id})"
            )
        except Exception as e:
            print("Notif admin gagal:", e)

# ================= START / MENU =================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    username = f"@{user.username}" if user.username else user.first_name or "Bossku"

    await add_subscriber(user.id, username, context.application)

    inline_buttons = InlineKeyboardMarkup([
        [InlineKeyboardButton("📢 SUBSCRIBE CHANNEL", url="https://t.me/afb88my")],
        [InlineKeyboardButton("💬 GROUP CUCI & TIPS GAME", url="https://t.me/+b685QE242dMxOWE9")],
        [InlineKeyboardButton("🌐 REGISTER & LOGIN", url="https://afb88my1.com/")],
        [InlineKeyboardButton("🎁 GROUP HADIAH AFB88", url="https://t.me/Xamoi2688")]
    ])

    reply_keyboard = ReplyKeyboardMarkup([
        ["🌟 NEW REGISTER FREE 🌟"],
        ["📘 SHARE FACEBOOK 📘"],
        ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
        ["🎉 TELEGRAM BONUS 🎉"]
    ], resize_keyboard=True)

    try:
        await update.message.reply_animation(
            "https://media.giphy.com/media/tXSLbuTIf37SjvE6QY/giphy.gif",
            caption=f"👋 Hi {username} Bossku 😘 Sila join semua group dulu ya ...",
            reply_markup=inline_buttons
        )
    except Exception:
        pass

    await update.message.reply_text("➤ CLICK /start TO BACK MENU", reply_markup=reply_keyboard)

# ================= MENU HANDLER =================
async def menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.type != "private":
        return

    text = update.message.text
    data = menu_data.get(text)
    if not data:
        return

    try:
        await update.message.reply_photo(
            photo=data["media"],
            caption=data["caption"],
            reply_markup=InlineKeyboardMarkup([[InlineKeyboardButton("CLAIM 🎁", url=data["url"])]]),
        )
    except Exception as e:
        print("Menu reply error:", e)

# ================= FORWARD COMMAND =================
async def forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id != ADMIN_USER_ID or update.effective_chat.id != SOURCE_CHAT_ID:
        return

    reply_to = update.message.reply_to_message
    if not reply_to:
        return

    # Forward ke TARGET_CHAT_IDS
    for target_id in TARGET_CHAT_IDS:
        if target_id == SOURCE_CHAT_ID:
            continue
        try:
            await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=reply_to.chat_id,
                message_id=reply_to.message_id
            )
        except Exception as e:
            print(f"Forward to {target_id} error:", e)

    # Forward ke subscribers
    for sub_id in list(subscribers):
        try:
            await context.bot.forward_message(
                chat_id=sub_id,
                from_chat_id=reply_to.chat_id,
                message_id=reply_to.message_id
            )
            time.sleep(0.5 + random.random() * 0.3)
        except Exception as e:
            print(f"Subscriber {sub_id} removed due to error:", e)
            subscribers.discard(sub_id)

    # Hapus command
    try:
        await update.message.delete()
    except Exception:
        pass

# ================= UNSUBSCRIBE =================
async def unsub(update: Update, context: ContextTypes.DEFAULT_TYPE):
    subscribers.discard(update.effective_user.id)
    await update.message.reply_text("✅ Anda telah berhenti langganan.")

# ================= AUTO DELETE BOT MESSAGE =================
async def auto_delete(update: Update, context: ContextTypes.DEFAULT_TYPE):
    bot_id = context.bot.id
    if update.effective_chat.id == SOURCE_CHAT_ID and update.effective_user.id == bot_id:
        time.sleep(AUTO_DELETE_DELAY)
        try:
            await update.message.delete()
        except Exception:
            pass

# ================= MAIN BOT =================
app = ApplicationBuilder().token(BOT_TOKEN).build()

# Command handlers
app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler(["menu", "help", "about", "profile", "contact"], start))
app.add_handler(CommandHandler("forward", forward))
app.add_handler(CommandHandler("unsub", unsub))

# Message handlers
app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), menu_handler))
app.add_handler(MessageHandler(filters.ALL, auto_delete))

# ================= FLASK KEEP ALIVE =================
flask_app = Flask(__name__)

@flask_app.route("/")
def index():
    return "🤖 Bot sedang berjalan"

def run_flask():
    flask_app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))

threading.Thread(target=run_flask).start()

# ================= RUN BOT =================
print("✅ Bot sedang dijalankan...")
app.run_polling()
