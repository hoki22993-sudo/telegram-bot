import os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

# Ambil token dari Environment Variable
TOKEN = os.getenv("BOT_TOKEN")

# Simpan daftar grup di memory
group_ids = set()

# Command /start → daftar grup
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    group_ids.add(chat_id)
    await update.message.reply_text("🤖 Bot aktif! Pesan admin akan diforward ke grup lain.")
    print(f"📌 Grup terdaftar: {group_ids}")

# Forward pesan dari admin ke semua grup lain
async def forward_if_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message and update.effective_chat.type in ["group", "supergroup"]:
        chat_id = update.effective_chat.id
        group_ids.add(chat_id)

        # cek apakah pengirim admin
        member = await context.bot.get_chat_member(chat_id, update.effective_user.id)
        if member.status in ["administrator", "creator"]:
            for gid in group_ids:
                if gid != chat_id:  # jangan kirim balik ke grup asal
                    try:
                        await update.message.forward(chat_id=gid)
                        print(f"✅ Forward sukses ke {gid}")
                    except Exception as e:
                        print(f"❌ Gagal forward ke {gid}: {e}")

def main():
    if not TOKEN:
        raise ValueError("❌ BOT_TOKEN belum diset di Environment Variables.")

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, forward_if_admin))

    print("🤖 Bot jalan...")
    app.run_polling()

if __name__ == "__main__":
    main()
