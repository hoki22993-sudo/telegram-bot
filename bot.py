import os
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes, CallbackContext

# Ambil dari Environment Variables
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

# ID grup source dan target (bisa daftar beberapa)
SOURCE_GROUPS = [-1001234567890]  # ganti dengan ID grup sumber
TARGET_GROUPS = [-1009876543210]  # ganti dengan ID grup tujuan

# Simpan mapping pesan source -> forwarded message
forwarded_messages = {}  # {chat_id: {message_id: forwarded_message_id}}

async def forward_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    source_chat_id = update.effective_chat.id
    message_id = update.effective_message.message_id

    if source_chat_id not in SOURCE_GROUPS:
        return

    forwarded_messages.setdefault(source_chat_id, {})

    for target_id in TARGET_GROUPS:
        msg = await context.bot.forward_message(
            chat_id=target_id,
            from_chat_id=source_chat_id,
            message_id=message_id
        )
        # Simpan mapping
        forwarded_messages[source_chat_id][message_id] = msg.message_id

async def delete_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Trigger ketika pesan dihapus di source grup.
    Telegram tidak mengirim update saat pesan dihapus,
    tapi kita bisa gunakan polling/administrasi via bot.
    """
    pass  # Telegram API tidak kirim delete info untuk bot biasa. Hanya admin channel bisa detect.

# Jalankan aplikasi
app = ApplicationBuilder().token(BOT_TOKEN).build()

# Tangkap semua pesan
app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), forward_message))

# Webhook
app.run_webhook(
    listen="0.0.0.0",
    port=int(os.environ.get("PORT", 8443)),
    webhook_url=f"{APP_URL}/{BOT_TOKEN}"
)
