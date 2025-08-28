import re
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters

# === Logging biar gampang debug ===
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# Ganti dengan token bot kamu (sebaiknya segera /revoke dan ganti token yang sudah tersebar)
TOKEN = "8492656457:AAHl6wRAmvQpO5wjkfyV-3_4B8UJJuUDiFE"

# === Teks menu (supaya satu sumber & aman di-regex) ===
MENU_OPTIONS = [
    "🌟 NEW REGISTER 🌟",
    "🍎 SHARE & FREE 🍎",
    "🔥 365 FREE CREDIT 🔥",
    "🌞 SOCIAL MEDIA 🌞",
    "🎉 TELEGRAM BONUS 🎉",
]
# Regex aman (emoji di-escape & pakai anchor ^$)
MENU_PATTERN = re.compile(r"^(%s)$" % "|".join(re.escape(x) for x in MENU_OPTIONS))

# ========= HANDLERS =========

# /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    username = f"@{user.username}" if user and user.username else (user.first_name if user else "Bossku")

    # Tombol inline (tetap ada, jangan diubah)
    keyboard = [
        [InlineKeyboardButton("✔️ Subcribe Channel", url="https://t.me/afb88my")],
        [InlineKeyboardButton("📢 Group Cuci&Tips GAME", url="https://t.me/+b685QE242dMxOWE9")],
        [InlineKeyboardButton("➤ Link Register", url="https://afb88my1.com/")],
    ]
    inline_menu = InlineKeyboardMarkup(keyboard)

    # Menu permanen (reply keyboard)
    reply_keyboard = [[opt] if opt not in ["🔥 365 FREE CREDIT 🔥", "🌞 SOCIAL MEDIA 🌞"] else
                      ["🔥 365 FREE CREDIT 🔥", "🌞 SOCIAL MEDIA 🌞"] for opt in MENU_OPTIONS]
    # Hasilnya:
    # ["🌟 NEW REGISTER 🌟"]
    # ["🍎 SHARE & FREE 🍎"]
    # ["🔥 365 FREE CREDIT 🔥", "🌞 SOCIAL MEDIA 🌞"]
    # ["🎉 TELEGRAM BONUS 🎉"]
    main_menu = ReplyKeyboardMarkup(reply_keyboard, resize_keyboard=True)

    # Gambar (HARUS link langsung .jpg/.png)
    photo_url = "https://i.ibb.co/tbRzzZb/sample-newregister.jpg"  # pastikan valid

    await msg.reply_photo(
        photo=photo_url,
        caption=(
            f"👋 Hi {username}, \n\n"
            "Bossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
            "Sila join Group2 yg saya share dlu. Pastikan anda dapat REZEKI di group2 saya ❤️:"
        ),
        reply_markup=inline_menu
    )

    await msg.reply_text(
        "➤ CLICK /start TO MENU :",
        reply_markup=main_menu
    )

# Callback tombol inline (tetap ada)
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.data == "profile":
        await query.edit_message_text("👤 Ini adalah menu profil kamu.")

# Balasan untuk menu permanen (reply keyboard)
async def reply_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    text = (msg.text or "").strip()
    logger.info("User klik menu: %s", text)

    if text == "🌟 NEW REGISTER 🌟":
        keyboard = [[InlineKeyboardButton("CLAIM NOW", url="https://afb88my1.com/")]]
        await msg.reply_photo(
            photo="https://i.ibb.co/tbRzzZb/sample-newregister.jpg",
            caption=(
                "🧧 New Register 🧧\n\n"
                "🎁 Free Credit RM88\n"
                "🎁 Min Withdraw RM1888\n"
                "🎁 Max Withdraw RM20"
            ),
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    elif text == "🍎 SHARE & FREE 🍎":
        keyboard = [[InlineKeyboardButton("SHARE SEKARANG", url="https://t.me/afb88my")]]
        await msg.reply_photo(
            photo="https://i.ibb.co/tbRzzZb/sharefree.jpg",
            caption=(
                "🍎 Share & Free 🍎\n\n"
                "🎁 Bagikan link ini ke teman dan dapatkan free credit!"
            ),
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    elif text == "🔥 365 FREE CREDIT 🔥":
        keyboard = [[InlineKeyboardButton("DAFTAR SEKARANG", url="https://afb88my1.com/")]]
        await msg.reply_photo(
            photo="https://i.ibb.co/sj3GZ4F/365credit.jpg",
            caption=(
                "🔥 365 FREE CREDIT 🔥\n\n"
                "🎁 Kredit free setiap hari!\n"
                "🎁 Klaim tanpa syarat"
            ),
            reply_markup=InlineKeyboardMarkup(keyboard)
        )

    elif text == "🌞 SOCIAL MEDIA 🌞":
        await msg.reply_text(
            "🌞 Ikuti sosial media kami untuk bonus spesial:\n\n"
            "📘 Facebook: https://facebook.com/afb88\n"
            "📸 Instagram: https://instagram.com/afb88\n"
            "🎥 TikTok: https://tiktok.com/@afb88"
        )

    elif text == "🎉 TELEGRAM BONUS 🎉":
        keyboard = [[InlineKeyboardButton("JOIN CHANNEL", url="https://t.me/afb88my")]]
        await msg.reply_photo(
            photo="https://i.ibb.co/8dY6yVq/telegrambonus.jpg",
            caption=(
                "🎉 Telegram Bonus 🎉\n\n"
                "🎁 Join channel kami & dapatkan bonus eksklusif!"
            ),
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    else:
        # Kalau ada teks lain yang tidak cocok menu, diam/opsional balas info
        logger.info("Teks tidak cocok menu, diabaikan: %s", text)

# Error handler (biar ketahuan kalau ada error)
async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.exception("Unhandled error: %s", context.error)

def main():
    app = Application.builder().token(TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("menu", start))
    app.add_handler(CommandHandler("about", start))
    app.add_handler(CommandHandler("profile", start))
    app.add_handler(CommandHandler("contact", start))

    # Inline button callback
    app.add_handler(CallbackQueryHandler(button))

    # Reply keyboard handler — hanya jika teks persis salah satu menu
    app.add_handler(MessageHandler(filters.TEXT & filters.Regex(MENU_PATTERN), reply_menu))

    # Error logger
    app.add_error_handler(on_error)

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
