import os
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

# Ambil token dari environment
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

# Buat objek aplikasi
app = ApplicationBuilder().token(BOT_TOKEN).build()

# Fungsi cek ID grup/channel
async def print_chat_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await update.message.reply_text(f"Chat ID grup/channel ini: {chat_id}")
    print("Chat ID:", chat_id)  # Juga tampil di log Render

# Tambahkan handler
app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), print_chat_id))

# Jalankan bot (polling untuk sementara, gampang cek)
app.run_polling()
