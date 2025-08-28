from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters

# Ganti dengan token bot kamu
TOKEN = "8492656457:AAHl6wRAmvQpO5wjkfyV-3_4B8UJJuUDiFE"

# Fungsi balasan (untuk /start dan pesan bebas)
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    username = f"@{user.username}" if user.username else user.first_name

    # Tombol inline (tetap ada, jangan diubah)
    keyboard = [
        [InlineKeyboardButton("✔️ Subcribe Channel", url="https://t.me/afb88my")],
        [InlineKeyboardButton("📢 Group Cuci&Tips GAME", url="https://t.me/+b685QE242dMxOWE9")],
        [InlineKeyboardButton("➤ Link Register", url="https://afb88my1.com/")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Menu permanen di dekat kolom chat
    reply_keyboard = [
        ["🌟 NEW REGISTER 🌟"],
        ["🍎 SHARE & FREE 🍎"],
        ["🔥 365 FREE CREDIT 🔥", "🌞 SOCIAL MEDIA 🌞"],
        ["🎉 TELEGRAM BONUS 🎉"]
    ]
    main_menu = ReplyKeyboardMarkup(reply_keyboard, resize_keyboard=True)

    # Gambar (gunakan link .jpg/.png langsung)
    photo_url = "https://i.ibb.co/tbRzzZb/sample-newregister.jpg"  # contoh link jpg/png

    await update.message.reply_photo(
        photo=photo_url,
        caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                f"Sila join Group2 yg saya share dlu. Pastikan anda dapat REZEKI di group2 saya ❤️:",
        reply_markup=reply_markup
    )

    # Kirim juga menu permanen (reply keyboard)
    await update.message.reply_text(
        "➤ CLICK /start TO MENU :",
        reply_markup=main_menu
    )

# Callback ketika tombol ditekan
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "profile":
        await query.edit_message_text("👤 Ini adalah menu profil kamu.")

# Fungsi balasan untuk menu permanen
async def reply_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text

    if text == "🌟 NEW REGISTER 🌟":
        keyboard = [[InlineKeyboardButton("CLAIM NOW", url="https://afb88my1.com/")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_photo(
            photo="https://i.ibb.co/tbRzzZb/sample-newregister.jpg",
            caption="🧧 New Register 🧧\n\n"
                    "🎁 Free Credit RM88\n"
                    "🎁 Min Withdraw RM1888\n"
                    "🎁 Max Withdraw RM20",
            reply_markup=reply_markup
        )

    elif text == "🍎 SHARE & FREE 🍎":
        keyboard = [[InlineKeyboardButton("SHARE SEKARANG", url="https://t.me/afb88my")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_photo(
            photo="https://i.ibb.co/tbRzzZb/sharefree.jpg",
            caption="🍎 Share & Free 🍎\n\n"
                    "🎁 Bagikan link ini ke teman dan dapatkan free credit!",
            reply_markup=reply_markup
        )

    elif text == "🔥 365 FREE CREDIT 🔥":
        keyboard = [[InlineKeyboardButton("DAFTAR SEKARANG", url="https://afb88my1.com/")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_photo(
            photo="https://i.ibb.co/sj3GZ4F/365credit.jpg",
            caption="🔥 365 FREE CREDIT 🔥\n\n"
                    "🎁 Kredit free setiap hari!\n"
                    "🎁 Klaim tanpa syarat",
            reply_markup=reply_markup
        )

    elif text == "🌞 SOCIAL MEDIA 🌞":
        await update.message.reply_text(
            "🌞 Ikuti sosial media kami untuk bonus spesial:\n\n"
            "📘 Facebook: https://facebook.com/afb88\n"
            "📸 Instagram: https://instagram.com/afb88\n"
            "🎥 TikTok: https://tiktok.com/@afb88"
        )

    elif text == "🎉 TELEGRAM BONUS 🎉":
        keyboard = [[InlineKeyboardButton("JOIN CHANNEL", url="https://t.me/afb88my")]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_photo(
            photo="https://i.ibb.co/8dY6yVq/telegrambonus.jpg",
            caption="🎉 Telegram Bonus 🎉\n\n"
                    "🎁 Join channel kami & dapatkan bonus eksklusif!",
            reply_markup=reply_markup
        )

def main():
    app = Application.builder().token(TOKEN).build()

    # Handler untuk command
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("menu", start))
    app.add_handler(CommandHandler("about", start))
    app.add_handler(CommandHandler("profile", start))
    app.add_handler(CommandHandler("contact", start))

    # Handler tombol
    app.add_handler(CallbackQueryHandler(button))

    # Handler untuk menu permanen
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, reply_menu))

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
