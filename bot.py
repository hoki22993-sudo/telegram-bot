import os
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

# Ambil token dari environment
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

# Buat objek bot
app = ApplicationBuilder().token(BOT_TOKEN).build()

# Fungsi cek ID semua grup/channel
async def print_chat_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    chat_type = update.effective_chat.type
    chat_title = update.effective_chat.title if update.effective_chat.title else "Private / Channel"
    
    msg = f"📌 Chat ID: {chat_id}\nType: {chat_type}\nTitle: {chat_title}"
    await update.message.reply_text(msg)
    print(msg)  # juga muncul di log Render

# Tangkap semua pesan untuk cek ID
app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), print_chat_id))

# Jalankan bot (polling cukup untuk cek)
app.run_polling()
