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
    photo_url = "https://ibb.co/m5XbX15b"  # pastikan link gambar langsung file .jpg/.png

    await update.message.reply_photo(
        photo=photo_url,
        caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                f"Sila join Group2 yg saya share dlu. Pastikan anda dapat REZEKI di group2 saya ❤️:",
        reply_markup=reply_markup
    )

    # Kirim juga menu permanen (reply keyboard)
    await update.message.reply_text(
        "➤ CLICK /start TO  MENU :",
        reply_markup=main_menu
    )

# Callback ketika tombol ditekan
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "profile":
        await query.edit_message_text("👤 Ini adalah menu profil kamu.")

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

    # Handler untuk pesan teks bebas
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, start))

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
