import os
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
)
from telegram.ext import (
    ApplicationBuilder, CommandHandler,
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

    # Tombol inline utama
    keyboard = [
        [InlineKeyboardButton("📢 SUBSCRIBE CHANNEL", url="https://t.me/afb88my")],
        [InlineKeyboardButton("💬 GROUP CUCI & TIPS GAME", url="https://t.me/+b685QE242dMxOWE9")],
        [InlineKeyboardButton("🌐 REGISTER & LOGIN", url="https://afb88my1.com/")],
        [InlineKeyboardButton("🔞 AMOI VIDEO XXX", url="https://t.me/Xamoi2688")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Menu permanen
    reply_keyboard = [
        ["🌟 NEW REGISTER FREE 🌟"],
        ["📘 SHARE FACEBOOK 📘"],
        ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
        ["🎉 TELEGRAM BONUS 🎉"]
    ]
    main_menu = ReplyKeyboardMarkup(reply_keyboard, resize_keyboard=True)

    # Gambar/gif
    media_type = "gif"
    media_url = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZudGg2bTVteGx2N3EwYng4a3ppMnhlcmltN2p2MTVweG1laXkyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXSLbuTIf37SjvE6QY/giphy.gif"

    if media_type == "gif":
        await update.message.reply_animation(
            animation=media_url,
            caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                    f"Sila join group2 yang saya share dulu. Pastikan anda dapat REZEKI di group2 saya ❤️",
            reply_markup=reply_markup
        )
    else:
        await update.message.reply_photo(
            photo=media_url,
            caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                    f"Sila join group2 yang saya share dulu. Pastikan anda dapat REZEKI di group2 saya ❤️",
            reply_markup=reply_markup
        )

    await update.message.reply_text("➤ CLICK /start TO BACK MENU:", reply_markup=main_menu)

# ================== REPLY MENU ==================
async def reply_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text

    menu_data = {
        # ... (isi menu_data sama seperti sebelumnya, tidak diubah)
    }

    if text in menu_data:
        keyboard = [[InlineKeyboardButton("CLAIM 🎁", url=menu_data[text]["url"])]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        media_type = menu_data[text].get("media_type", "photo")
        media = menu_data[text].get("media")

        if media_type == "gif":
            await update.message.reply_animation(
                animation=media,
                caption=menu_data[text]["caption"],
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_photo(
                photo=media,
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

# ================== HELPER: 8 INLINE BUTTONS ==================
def get_inline_keyboard():
    keyboard = [
        [
            InlineKeyboardButton("📲 Telegram", url="https://t.me/afb88my"),
            InlineKeyboardButton("📝 Register", url="https://afb88my1.com/")
        ],
        [
            InlineKeyboardButton("🎁 Bonus", url="https://afb88my1.com/promotion"),
            InlineKeyboardButton("💬 Grup Tips", url="https://t.me/+b685QE242dMxOWE9")
        ],
        [
            InlineKeyboardButton("🔥 Apps Free", url="https://afb88.hfcapital.top/"),
            InlineKeyboardButton("📘 Facebook", url="https://www.facebook.com/share/g/1GGcZKo6zN/")
        ],
        [
            InlineKeyboardButton("🎉 Telegram Bonus", url="https://t.me/afb88my"),
            InlineKeyboardButton("🌞 Sosial Media", url="https://instagram.com/afb88")
        ]
    ]
    return InlineKeyboardMarkup(keyboard)

# ================== POST COMMAND (HANYA ADMIN) ==================
async def post(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    if user_id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Anda bukan admin yang diizinkan!")
        return

    if context.args:
        message_text = " ".join(context.args)
    else:
        await update.message.reply_text("❌ Contoh penggunaan: /post Selamat datang bosku!")
        return

    await context.bot.send_message(
        chat_id=chat_id,
        text=message_text,
        reply_markup=get_inline_keyboard()
    )

# ================== AUTO POST MEDIA (HANYA ADMIN) ==================
async def auto_post_media(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    if user_id != ADMIN_USER_ID:
        return

    caption = update.message.caption or ""

    if update.message.photo:
        file_id = update.message.photo[-1].file_id
        await context.bot.send_photo(
            chat_id=chat_id,
            photo=file_id,
            caption=caption,
            reply_markup=get_inline_keyboard()
        )

    elif update.message.video:
        file_id = update.message.video.file_id
        await context.bot.send_video(
            chat_id=chat_id,
            video=file_id,
            caption=caption,
            reply_markup=get_inline_keyboard()
        )

    elif update.message.animation:
        file_id = update.message.animation.file_id
        await context.bot.send_animation(
            chat_id=chat_id,
            animation=file_id,
            caption=caption,
            reply_markup=get_inline_keyboard()
        )

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
    app.add_handler(CommandHandler("post", post))

    # Handlers
    app.add_handler(CallbackQueryHandler(button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE, reply_menu))

    # Media auto-post khusus admin
    app.add_handler(MessageHandler(filters.PHOTO & filters.ChatType.GROUPS, auto_post_media))
    app.add_handler(MessageHandler(filters.VIDEO & filters.ChatType.GROUPS, auto_post_media))
    app.add_handler(MessageHandler(filters.ANIMATION & filters.ChatType.GROUPS, auto_post_media))

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
