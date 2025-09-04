import os
import json
import asyncio
import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ========================
# Logging
# ========================
logging.basicConfig(
    format="%(asctime)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")
PORT = int(os.environ.get("PORT", 8443))
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set!")

SOURCE_GROUPS = [-1003038090571]  # ID grup sumber
TARGET_GROUPS = [-1002967257984, -1002996882426]  # ID grup target

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
# Forward Command
# ========================
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    if chat.id not in SOURCE_GROUPS:
        await update.message.reply_text("❌ Chat bukan source group.")
        return

    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        await update.message.reply_text("❌ Hanya admin yang bisa forward.")
        return

    # Bisa forward via reply atau via message_id arg
    if update.message.reply_to_message:
        message_id = update.message.reply_to_message.message_id
    elif context.args:
        try:
            message_id = int(context.args[0])
        except:
            await update.message.reply_text("❌ Argumen tidak valid. Balas pesan atau gunakan message_id.")
            return
    else:
        await update.message.reply_text("❌ Balas pesan atau sertakan message_id.")
        return

    str_chat_id = str(chat.id)
    str_msg_id = str(message_id)
    forwarded_messages.setdefault(str_chat_id, {})
    forwarded_messages[str_chat_id].setdefault(str_msg_id, {})

    success_count = 0
    for target_id in TARGET_GROUPS:
        try:
            msg = await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=chat.id,
                message_id=message_id
            )
            forwarded_messages[str_chat_id][str_msg_id][str(target_id)] = msg.message_id
            success_count += 1
            await asyncio.sleep(0.3)
        except Exception as e:
            await update.message.reply_text(f"❌ Gagal forward ke {target_id}: {e}")
            logging.error(f"Gagal forward ke {target_id}: {e}")

    save_mapping()
    await update.message.reply_text(f"✅ Forward selesai ke {success_count}/{len(TARGET_GROUPS)} grup.")

# ========================
# Delete Command
# ========================
async def delete_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        await update.message.reply_text("❌ Hanya admin yang bisa delete.")
        return

    if len(context.args) != 1:
        await update.message.reply_text("❌ Gunakan: /delete <message_id>")
        return

    message_id = context.args[0]
    str_chat_id = str(chat.id)

    if str_chat_id not in forwarded_messages or message_id not in forwarded_messages[str_chat_id]:
        await update.message.reply_text("❌ Tidak ada pesan yang sesuai.")
        return

    for target_id, fwd_msg_id in forwarded_messages[str_chat_id][message_id].items():
        try:
            await context.bot.delete_message(chat_id=int(target_id), message_id=int(fwd_msg_id))
        except Exception as e:
            await update.message.reply_text(f"❌ Gagal hapus di {target_id}: {e}")
            logging.error(f"Gagal hapus di {target_id}: {e}")

    del forwarded_messages[str_chat_id][message_id]
    save_mapping()
    await update.message.reply_text("✅ Pesan berhasil dihapus!")

# ========================
# Setup Bot & Webhook
# ========================
app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("forward", forward_command))
app.add_handler(CommandHandler("delete", delete_forward))

webhook_url = f"{APP_URL}/webhook/{BOT_TOKEN}"
logging.info(f"Webhook aktif: {webhook_url}")

app.run_webhook(
    listen="0.0.0.0",
    port=PORT,
    url_path=f"webhook/{BOT_TOKEN}",
    webhook_url=webhook_url
)
