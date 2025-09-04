import os
import json
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, ContextTypes
from telegram.error import TimedOut, TelegramError

# ========================
# Konfigurasi
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

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
# Forward pesan (hanya admin)
# ========================
async def forward_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user

    if chat.id not in SOURCE_GROUPS:
        return

    # Cek apakah user admin
    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        print(f"Pesan dari non-admin diabaikan: {user.id}")
        return

    message_id = update.effective_message.message_id
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
            print(f"Forwarded pesan {message_id} ke {target_id}")
            await asyncio.sleep(0.5)
        except TimedOut:
            print(f"Timeout saat forward ke {target_id}, lewati sementara")
        except TelegramError as e:
            print(f"Gagal forward ke {target_id}: {e}")

    save_mapping()

# ========================
# Command hapus forward (hanya admin)
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
            print(f"Pesan {fwd_msg_id} di {target_id} dihapus")
        except TelegramError as e:
            print(f"Gagal hapus pesan {fwd_msg_id} di {target_id}: {e}")

    del forwarded_messages[str_chat_id][message_id]
    save_mapping()
    await update.message.reply_text(f"Pesan {message_id} berhasil dihapus dari semua target.")

# ========================
# Jalankan bot dengan polling
# ========================
app = ApplicationBuilder().token(BOT_TOKEN).build()

app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), forward_message))
app.add_handler(CommandHandler("delete", delete_forward))

print("Bot berjalan dengan polling (hanya pesan admin yang di-forward)...")
app.run_polling()
