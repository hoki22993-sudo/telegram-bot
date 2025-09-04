import os
import json
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")  # misal https://telegram-bot-bp4g.onrender.com
PORT = int(os.environ.get("PORT", 8443))
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

# ID grup
SOURCE_GROUPS = [-1003038090571]  # ganti sesuai source grup Anda
TARGET_GROUPS = [-1002967257984, -1002996882426]  # ganti target grup

# Load mapping
if os.path.exists(MAPPING_FILE):
    with open(MAPPING_FILE, "r") as f:
        forwarded_messages = json.load(f)
else:
    forwarded_messages = {}

def save_mapping():
    with open(MAPPING_FILE, "w") as f:
        json.dump(forwarded_messages, f)

# ========================
# Handler / Perintah
# ========================

# Forward via reply
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    if chat.id not in SOURCE_GROUPS:
        return

    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        await update.message.reply_text("❌ Hanya admin yang bisa menggunakan perintah ini.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Balas pesan yang ingin di-forward.")
        return

    message_id = update.message.reply_to_message.message_id
    str_chat_id = str(chat.id)
    str_msg_id = str(message_id)
    forwarded_messages.setdefault(str_chat_id, {})
    forwarded_messages[str_chat_id].setdefault(str_msg_id, {})

    for target_id in TARGET_GROUPS:
        try:
            msg = await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=chat.id,
                message_id=message_id
            )
            forwarded_messages[str_chat_id][str_msg_id][str(target_id)] = msg.message_id
            await asyncio.sleep(0.3)
        except Exception as e:
            print(f"Gagal forward ke {target_id}: {e}")

    save_mapping()
    await update.message.reply_text("✅ Pesan berhasil di-forward!")

# Delete forward
async def delete_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        await update.message.reply_text("❌ Hanya admin yang bisa menggunakan perintah ini.")
        return

    if len(context.args) != 1:
        await update.message.reply_text("❌ Gunakan: /delete <message_id>")
        return

    message_id = context.args[0]
    str_chat_id = str(chat.id)

    if str_chat_id not in forwarded_messages or message_id not in forwarded_messages[str_chat_id]:
        await update.message.reply_text("❌ Tidak ada pesan yang sesuai untuk dihapus.")
        return

    for target_id, fwd_msg_id in forwarded_messages[str_chat_id][message_id].items():
        try:
            await context.bot.delete_message(chat_id=int(target_id), message_id=int(fwd_msg_id))
        except Exception as e:
            print(f"Gagal hapus di {target_id}: {e}")

    del forwarded_messages[str_chat_id][message_id]
    save_mapping()
    await update.message.reply_text("✅ Pesan berhasil dihapus!")

# ========================
# Setup bot & webhook
# ========================
app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("forward", forward_command))
app.add_handler(CommandHandler("delete", delete_forward))

# Jalankan webhook
webhook_url = f"{APP_URL}/webhook/{BOT_TOKEN}"
print(f"Webhook aktif: {webhook_url}")

app.run_webhook(
    listen="0.0.0.0",
    port=PORT,
    url_path=f"webhook/{BOT_TOKEN}",
    webhook_url=webhook_url
)
