import os
import json
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from telegram.error import TimedOut, TelegramError

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")  # URL Render Anda
PORT = int(os.environ.get("PORT", 8443))
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN or not APP_URL:
    raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di environment variables!")

SOURCE_GROUPS = [-1003038090571]  # Grup sumber
TARGET_GROUPS = [
    -1002967257984,
    -1002996882426
]  # Target grup/channel

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
# Forward pesan via reply
# ========================
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    if chat.id not in SOURCE_GROUPS:
        await update.message.reply_text("❌ Grup ini bukan grup sumber.")
        return

    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        await update.message.reply_text("❌ Hanya admin grup yang bisa forward pesan.")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward, lalu ketik /forward")
        return

    message_id = update.message.reply_to_message.message_id
    str_chat_id = str(chat.id)
    str_msg_id = str(message_id)

    forwarded_messages.setdefault(str_chat_id, {})
    forwarded_messages[str_chat_id].setdefault(str_msg_id, {})

    try:
        for target_id in TARGET_GROUPS:
            msg = await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=chat.id,
                message_id=message_id
            )
            forwarded_messages[str_chat_id][str_msg_id][str(target_id)] = msg.message_id
            await asyncio.sleep(0.5)
        save_mapping()
        await update.message.reply_text("✅ Pesan berhasil di-forward ke semua target.")
    except TimedOut:
        await update.message.reply_text("⚠️ Timeout saat forward, coba lagi nanti.")
    except TelegramError as e:
        await update.message.reply_text(f"❌ Gagal forward pesan: {e}")

# ========================
# Delete forward (hanya admin)
# ========================
async def delete_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        await update.message.reply_text("❌ Hanya admin grup yang bisa hapus pesan forward.")
        return

    if len(context.args) != 1:
        await update.message.reply_text("Gunakan: /delete <message_id>")
        return

    message_id = context.args[0]
    str_chat_id = str(chat.id)

    if str_chat_id not in forwarded_messages or message_id not in forwarded_messages[str_chat_id]:
        await update.message.reply_text("Pesan tidak ditemukan di mapping.")
        return

    for target_id, fwd_msg_id in forwarded_messages[str_chat_id][message_id].items():
        try:
            await context.bot.delete_message(chat_id=int(target_id), message_id=int(fwd_msg_id))
        except TelegramError as e:
            print(f"Gagal hapus pesan {fwd_msg_id} di {target_id}: {e}")

    del forwarded_messages[str_chat_id][message_id]
    save_mapping()
    await update.message.reply_text(f"Pesan {message_id} berhasil dihapus dari semua target.")

# ========================
# Jalankan bot dengan webhook
# ========================
app = ApplicationBuilder().token(BOT_TOKEN).build()

app.add_handler(CommandHandler("forward", forward_command))
app.add_handler(CommandHandler("delete", delete_forward))

# Jalankan webhook
WEBHOOK_PATH = f"/webhook/{BOT_TOKEN}"
WEBHOOK_URL = f"{APP_URL}{WEBHOOK_PATH}"

print("Bot berjalan dengan webhook (reply admin untuk forward)...")
print(f"Webhook URL: {WEBHOOK_URL}")

app.run_webhook(
    listen="0.0.0.0",
    port=PORT,
    webhook_url=WEBHOOK_URL
)
