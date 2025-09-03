import os
import json
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes, CommandHandler

# Ambil token dari environment variable
TOKEN = os.getenv("BOT_TOKEN")  
GROUP_FILE = "groups.json"

# ==========================
# Helper: Simpan & Ambil Grup
# ==========================
def load_groups():
    try:
        with open(GROUP_FILE, "r") as f:
            return set(json.load(f))
    except (FileNotFoundError, json.JSONDecodeError):
        return set()

def save_groups(groups):
    with open(GROUP_FILE, "w") as f:
        json.dump(list(groups), f)

group_ids = load_groups()

# ==========================
# Fungsi Forward
# ==========================
async def forward_if_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message and update.effective_chat.type in ["group", "supergroup"]:
        chat_id = update.effective_chat.id

        # Daftarkan grup ke list
        if chat_id not in group_ids:
            group_ids.add(chat_id)
            save_groups(group_ids)

        # Cek apakah pengirim admin
        member = await context.bot.get_chat_member(chat_id, update.effective_user.id)
        if member.status in ["administrator", "creator"]:
            for gid in group_ids:
                if gid != chat_id:  # jangan forward balik ke grup asal
                    try:
                        await update.message.forward(chat_id=gid)
                        print(f"Forward sukses ke {gid}")
                    except Exception as e:
                        print(f"Gagal forward ke {gid}: {e}")

# ==========================
# Command /start
# ==========================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 Bot aktif!\n"
        "➡️ Semua postingan admin di grup ini akan diforward ke grup lain yang ada bot."
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
    app.add_handler(MessageHandler(filters.ALL, forward_if_admin))

    print("🤖 Bot sudah jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
