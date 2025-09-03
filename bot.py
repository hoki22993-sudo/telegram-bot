import os
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

app = ApplicationBuilder().token(BOT_TOKEN).build()

async def print_chat_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Cek apakah update punya message
    msg_obj = update.message or update.channel_post
    if not msg_obj:
        return  # jika tidak ada message, skip

    chat = msg_obj.chat
    chat_id = chat.id
    chat_type = chat.type
    chat_title = chat.title if chat.title else "Private / Channel"

    reply_text = f"📌 Chat ID: {chat_id}\nType: {chat_type}\nTitle: {chat_title}"
    await msg_obj.reply_text(reply_text)
    print(reply_text)  # tampil di log Render

# Tangkap semua pesan untuk cek ID
app.add_handler(MessageHandler(filters.ALL, print_chat_id))

# Jalankan bot
app.run_polling()
