import os
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
)
from telegram.ext import (
    ApplicationBuilder, Application, CommandHandler,
    ContextTypes, CallbackQueryHandler, MessageHandler, filters
)

# ================= CONFIG =================
BOT_TOKEN = os.environ.get("BOT_TOKEN") or "ISI_TOKEN_DI_SINI"

# Admin & grup forward
ADMIN_USER_ID = 1087968824
SOURCE_CHAT_ID = -1003038090571
TARGET_CHAT_IDS = [-1002967257984, -1002996882426]

# ================== START & MENU ==================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    username = f"@{user.username}" if user.username else user.first_name

    # Tombol inline
    keyboard = [
        [InlineKeyboardButton("✔️ SUBCRIBE CHANEL", url="https://t.me/afb88my")],
        [InlineKeyboardButton("📢 GROUP CUCI & TIPS GAME", url="https://t.me/+b685QE242dMxOWE9")],
        [InlineKeyboardButton("🌐 REGISTER & LOGIN ", url="https://afb88my1.com/")],
        [InlineKeyboardButton("🔞 Amoi Video XXX ", url="t.me/Xamoi2688")],
        
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Menu permanen
    reply_keyboard = [
        ["🌟 NEW REGISTER FREE 🌟"],
        [" SHARE FACEBOOK ➤"],
        ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
        ["🎉 TELEGRAM BONUS 🎉"]
    ]
    main_menu = ReplyKeyboardMarkup(reply_keyboard, resize_keyboard=True)

    # Gambar
    photo_url = "https://ibb.co/m5XbX15b"

    await update.message.reply_photo(
        photo=photo_url,
        caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                f"Sila join Group2 yg saya share dlu. Pastikan anda dapat REZEKI di group2 saya ❤️",
        reply_markup=reply_markup
    )
    await update.message.reply_text("➤ CLICK /start TO  MENU :", reply_markup=main_menu)

# ================== REPLY MENU ==================
async def reply_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text

menu_data = {
    "🌟 NEW REGISTER FREE 🌟": {
        "url": "https://afb88my1.com/",
        "caption": """🧧 NEW REGISTER BONUS 🧧

🎁 Free Credit RM88  
🎁 Min WD/CUCI RM2000  
🎁 Max.Payment/WD RM40  

💡 Cara klaim:  
1. Register di link yang sudah disediakan.  
2. Hubungi CS melalui livechat.  
3. Deposit minimal sesuai syarat.  
4. Bonus akan dikreditkan otomatis.  

⚠️ Syarat & ketentuan berlaku!"""
    },
    "➤ SHARE FACEBOOK ➤": {
        "url": "https://ibb.co/m5XbX15b",
        "caption": """🧧 FREE CREDIT RM68 🧧

🎁 STEP 1: Join Telegram Chanel kami  
🎁 STEP 2: Share postingan di Facebook  
🎁 STEP 3: Tag teman minimal 5 orang  

✅ Bonus akan diberikan setelah verifikasi selesai"""
    },
    "🔥 DAILY APPS FREE 🔥": {
        "url": "https://afb88my1.com/",
        "caption": """🔥 FREE CREDIT RM 20 🔥

📌 Hadiah klaim harian 1x per user  
💰 Min. Withdraw RM600  
💳 Max. Payment RM10,000  
❌ Balance di bawah RM0.10 tidak bisa diproses  

➡️ Download aplikasi resmi untuk klaim hadiah harian!"""
    },
    "🌞 SOCIAL MEDIA 🌞": {
        "url": "https://facebook.com/afb88",
        "caption": """🌞 Ikuti sosial media kami untuk info & promo terbaru 🌞

📘 Facebook: https://facebook.com/afb88  
📸 Instagram: https://instagram.com/afb88  
🎥 TikTok: https://tiktok.com/@afb88  

🎯 Jangan sampai ketinggalan update event dan bonus menarik!"""
    },
    "🎉 TELEGRAM BONUS 🎉": {
        "url": "https://t.me/afb88my",
        "caption": """🎉 TELEGRAM BONUS 🎉

🎁 Join channel kami untuk mendapatkan:  
- Bonus eksklusif harian  
- Event spesial mingguan  
- Giveaway member setia  

👉 Klik tombol CLAIM di bawah untuk bergabung!"""
    },
}

    if text in menu_data:
        keyboard = [[InlineKeyboardButton("CLAIM", url=menu_data[text]["url"])]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_photo(
            photo="https://ibb.co/m5XbX15b",
            caption=menu_data[text]["caption"],
            reply_markup=reply_markup
        )

# ================== INLINE BUTTON ==================
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "profile":
        await query.edit_message_text("👤 Ini adalah menu profil kamu.")

# ================== FORWARD COMMAND ==================
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id

    if user_id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Anda bukan admin yang diizinkan!")
        return

    if chat_id != SOURCE_CHAT_ID:
        await update.message.reply_text("❌ Command hanya bisa digunakan di grup utama!")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        return

    failed = []
    for target_id in TARGET_CHAT_IDS:
        try:
            await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=update.message.reply_to_message.chat.id,
                message_id=update.message.reply_to_message.message_id
            )
        except Exception as e:
            failed.append(f"{target_id} ({e})")

    if failed:
        await update.message.reply_text(f"❌ Gagal forward: {', '.join(failed)}")

# ================== MAIN ==================
def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("menu", start))
    app.add_handler(CommandHandler("about", start))
    app.add_handler(CommandHandler("profile", start))
    app.add_handler(CommandHandler("contact", start))
    app.add_handler(CommandHandler("forward", forward_command))

    # Handlers
    app.add_handler(CallbackQueryHandler(button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, reply_menu))

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
