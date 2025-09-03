import os
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

# Ambil token & URL dari environment
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

# Grup sumber (pesan dari sini akan di-forward)
SOURCE_GROUPS = [-1003038090571]

# Grup & channel tujuan
TARGET_GROUPS = [
    -1002967257984,
    -1002996882426
]

# Simpan mapping pesan source -> forwarded messages
forwarded_messages = {}  # {source_chat_id: {message_id: {target_id: forwarded_message_id}}}

async def forward_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    message_id = update.effective_message.message_id

    if chat_id not in SOURCE_GROUPS:
        return

    forwarded_messages.setdefault(chat_id, {})
    forwarded_messages[chat_id].setdefault(message_id, {})

    for target_id in TARGET_GROUPS:
        msg = await context.bot.forward_message(
            chat_id=target_id,
            from_chat_id=chat_id,
            message_id=message_id
        )
        forwarded_messages[chat_id][message_id][target_id] = msg.message_id

async def delete_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Jika pesan dihapus di grup sumber, hapus juga di target.
    Hanya bisa dijalankan jika bot admin di target.
    """
    chat_id = update.effective_chat.id
    message_id = update.effective_message.message_id

    if chat_id in forwarded_messages and message_id in forwarded_messages[chat_id]:
        for target_id, fwd_msg_id in forwarded_messages[chat_id][message_id].items():
            try:
                await context.bot.delete_message(chat_id=target_id, message_id=fwd_msg_id)
            except Exception as e:
                print(f"Gagal hapus pesan {fwd_msg_id} di {target_id}: {e}")

# Jalankan aplikasi
app = ApplicationBuilder().token(BOT_TOKEN).build()

# Tangkap semua pesan dari grup sumber untuk forward
app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), forward_message))

# Tangkap pesan yang dihapus (hanya bisa jika bot admin dan menggunakan channel/supergroup)
app.add_handler(MessageHandler(filters.StatusUpdate.MESSAGE_DELETED, delete_message))

# Run webhook
app.run_webhook(
    listen="0.0.0.0",
    port=int(os.environ.get("PORT", 8443)),
    webhook_url=f"{APP_URL}/{BOT_TOKEN}"
)
