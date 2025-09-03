import os
import json
from telegram import Update
from telegram.ext import (
    Application, MessageHandler, filters,
    ContextTypes, CommandHandler
)

TOKEN = os.getenv("BOT_TOKEN")  # token dari environment variable
GROUP_FILE = "groups.json"
MAP_FILE = "message_map.json"

# ==========================
# Helper: Simpan & Ambil Grup
# ==========================
def load_json(filename):
    try:
        with open(filename, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_json(filename, data):
    with open(filename, "w") as f:
        json.dump(data, f)

group_ids = set(load_json(GROUP_FILE))  # daftar grup
message_map = load_json(MAP_FILE)       # mapping pesan

# ==========================
# Fungsi Forward
# ==========================
async def forward_if_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message and update.effective_chat.type in ["group", "supergroup"]:
        chat_id = update.effective_chat.id

        # Daftarkan grup
        if chat_id not in group_ids:
            group_ids.add(chat_id)
            save_json(GROUP_FILE, list(group_ids))

        # Cek apakah pengirim admin
        member = await context.bot.get_chat_member(chat_id, update.effective_user.id)
        if member.status in ["administrator", "creator"]:
            for gid in group_ids:
                if gid != chat_id:
                    try:
                        forwarded = await update.message.forward(chat_id=gid)

                        # simpan mapping
                        message_map.setdefault(str(update.message.message_id), {})
                        message_map[str(update.message.message_id)][str(gid)] = forwarded.message_id
                        save_json(MAP_FILE, message_map)

                        print(f"Forward sukses ke {gid}")
                    except Exception as e:
                        print(f"Gagal forward ke {gid}: {e}")

# ==========================
# Fungsi Hapus Sinkron
# ==========================
async def delete_if_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_chat.type in ["group", "supergroup"]:
        deleted_ids = update.message.message_id if update.message else None

        if deleted_ids and str(deleted_ids) in message_map:
            mapping = message_map[str(deleted_ids)]
            for gid, fwd_msg_id in mapping.items():
                try:
                    await context.bot.delete_message(chat_id=int(gid), message_id=fwd_msg_id)
                    print(f"Pesan {deleted_ids} dihapus di grup {gid}")
                except Exception as e:
                    print(f"Gagal hapus di {gid}: {e}")

            # hapus mapping biar bersih
            del message_map[str(deleted_ids)]
            save_json(MAP_FILE, message_map)

# ==========================
# Command /start
# ==========================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 Bot aktif!\n"
        "➡️ Semua postingan admin akan diforward dan dihapus sinkron di semua grup."
    )

# ==========================
# Main
# ==========================
def main():
    if not TOKEN:
        raise ValueError("❌ BOT_TOKEN tidak ditemukan! Set environment variable BOT_TOKEN dulu.")

    app = Application.builder().token(TOKEN).build()

    # Handler
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, forward_if_admin))
    app.add_handler(MessageHandler(filters.Deleted, delete_if_admin))

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
