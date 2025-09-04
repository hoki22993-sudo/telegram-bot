import os
from telegram import Update, Message
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
ADMIN_IDS = [8327252807]  # Ganti dengan ID admin
SOURCE_CHAT_ID = -1003038090571  # ID grup/channel sumber
TARGET_CHAT_ID = -1002967257984  # ID grup/channel tujuan

# ========================
# Command Handler
# ========================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id in ADMIN_IDS:
        await update.message.reply_text("Bot siap! Gunakan /forward untuk aktifkan forwarding.")
    else:
        await update.message.reply_text("Anda bukan admin.")

async def forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("Anda tidak punya akses.")
        return
    context.application.bot_data['forwarding'] = True
    await update.message.reply_text("Forwarding diaktifkan ✅")

async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("Anda tidak punya akses.")
        return
    context.application.bot_data['forwarding'] = False
    await update.message.reply_text("Forwarding dihentikan ❌")

# ========================
# Auto Forward Handler
# ========================
async def auto_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.application.bot_data.get('forwarding', False):
        return  # Mode forwarding mati
    msg: Message = update.message
    if update.effective_chat.id != SOURCE_CHAT_ID:
        return  # Hanya dari source chat

    try:
        # Forward berdasarkan tipe pesan
        if msg.text:
            await context.bot.send_message(chat_id=TARGET_CHAT_ID, text=msg.text)
            print(f"[TEXT] {msg.text[:30]}... forwarded")
        elif msg.photo:
            photo_file = msg.photo[-1]  # resolusi tertinggi
            await context.bot.send_photo(chat_id=TARGET_CHAT_ID, photo=photo_file.file_id, caption=msg.caption)
            print(f"[PHOTO] Photo forwarded")
        elif msg.video:
            await context.bot.send_video(chat_id=TARGET_CHAT_ID, video=msg.video.file_id, caption=msg.caption)
            print(f"[VIDEO] Video forwarded")
        elif msg.document:
            await context.bot.send_document(chat_id=TARGET_CHAT_ID, document=msg.document.file_id, caption=msg.caption)
            print(f"[DOCUMENT] Document forwarded")
        else:
            print(f"[SKIPPED] Unsupported type: {msg}")
    except Exception as e:
        print(f"Error forwarding: {e}")

# ========================
# Main
# ========================
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("forward", forward))
    app.add_handler(CommandHandler("stop", stop))

    # Messages
    app.add_handler(MessageHandler(filters.ALL, auto_forward))

    print("Bot berjalan...")
    app.run_polling()
