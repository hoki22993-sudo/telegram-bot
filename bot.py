import os
import json
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes
from telegram.error import TimedOut, TelegramError

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

# Grup sumber
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
    chat_id = int(update.effective_chat.id)
    message_id = int(update.effective_message.message_id)
    print(f"Pesan diterima dari {chat_id}: {message_id}")

    if chat_id not in SOURCE_GROUPS:
        print(f"Bukan grup sumber, diabaikan: {chat_id}")
        return

    str_chat_id = str(chat_id)
    str_msg_id = str(message_id)

    forwarded_messages.setdefault(str_chat_id, {})
    forwarded_messages[str_chat_id].setdefault(str_msg_id, {})

    for target_id in TARGET_GROUPS:
        try:
            msg = await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=chat_id,
                message_id=message_id
            )
            forwarded_messages[str_chat_id][str_msg_id][str(target_id)] = msg.message_id
            print(f"Forwarded ke {target_id}: {msg.message_id}")
            await asyncio.sleep(0.5)  # jeda antar forward
        except TimedOut:
            print(f"Timeout saat forward ke {target_id}, lewati sementara")
        except TelegramError as e:
            print(f"Gagal forward ke {target_id}: {e}")

    save_mapping()

# ========================
# Hapus pesan (manual command bisa ditambahkan nanti)
# ========================
async def delete_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    message_id = str(update.effective_message.message_id)

    if chat_id in forwarded_messages and message_id in forwarded_messages[chat_id]:
        for target_id, fwd_msg_id in forwarded_messages[chat_id][message_id].items():
            try:
                await context.bot.delete_message(chat_id=int(target_id), message_id=int(fwd_msg_id))
                print(f"Pesan {fwd_msg_id} di {target_id} dihapus")
            except TelegramError as e:
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

# ========================
# Hapus pesan otomatis belum bisa pakai MESSAGE_DELETED
# Bisa ditambahkan command manual untuk delete
# ========================

# Run webhook
app.run_webhook(
    listen="0.0.0.0",
    port=int(os.environ.get("PORT", 8443)),
    webhook_url=f"{APP_URL}/{BOT_TOKEN}"
)
