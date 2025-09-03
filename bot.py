import os
import json
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

# Grup sumber (pesan dari sini akan di-forward)
SOURCE_GROUPS = [-1003038090571]

# Target grup/channel
TARGET_GROUPS = [
    -1002967257984,
    -1002996882426
]

# ========================
# Load / Save mapping
# ========================
if os.path.exists(MAPPING_FILE):
    with open(MAPPING_FILE, "r") as f:
        forwarded_messages = json.load(f)
else:
    forwarded_messages = {}

def save_mapping():
    with open(MAPPING_FILE, "w") as f:
        json.dump(forwarded_messages, f)

# ========================
# Forward pesan
# ========================
async def forward_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    message_id = str(update.effective_message.message_id)

    if int(chat_id) not in SOURCE_GROUPS:
        return

    forwarded_messages.setdefault(chat_id, {})
    forwarded_messages[chat_id].setdefault(message_id, {})

    for target_id in TARGET_GROUPS:
        msg = await context.bot.forward_message(
            chat_id=target_id,
            from_chat_id=int(chat_id),
            message_id=int(message_id)
        )
        forwarded_messages[chat_id][message_id][str(target_id)] = msg.message_id

    save_mapping()

# ========================
# Hapus pesan jika sumber dihapus
# ========================
async def delete_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    message_id = str(update.effective_message.message_id)

    if chat_id in forwarded_messages and message_id in forwarded_messages[chat_id]:
        for target_id, fwd_msg_id in forwarded_messages[chat_id][message_id].items():
            try:
                await context.bot.delete_message(chat_id=int(target_id), message_id=int(fwd_msg_id))
            except Exception as e:
                print(f"Gagal hapus pesan {fwd_msg_id} di {target_id}: {e}")

        # Hapus mapping setelah delete
        del forwarded_messages[chat_id][message_id]
        save_mapping()

# ========================
# Jalankan bot
# ========================
app = ApplicationBuilder().token(BOT_TOKEN).build()

# Tangkap semua pesan dari grup sumber untuk forward
app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), forward_message))

# Untuk delete pesan, Telegram tidak selalu kirim update MESSAGE_DELETED,
# tapi jika ingin trigger manual bisa pakai command lain.
# app.add_handler(MessageHandler(filters.StatusUpdate.MESSAGE_DELETED, delete_message))

app.run_webhook(
    listen="0.0.0.0",
    port=int(os.environ.get("PORT", 8443)),
    webhook_url=f"{APP_URL}/{BOT_TOKEN}"
)
