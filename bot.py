import os
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

# Ambil token dari Environment Variable
TOKEN = os.getenv("BOT_TOKEN")

async def forward_if_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Forward pesan hanya kalau pengirim admin grup."""
    if update.message and update.effective_chat.type in ["group", "supergroup"]:
        chat_id = update.effective_chat.id

        # cek apakah user adalah admin/creator
        member = await context.bot.get_chat_member(chat_id, update.effective_user.id)
        if member.status in ["administrator", "creator"]:
            for gid in context.bot_data.get("groups", set()):
                if gid != chat_id:  # jangan kirim balik ke grup asal
                    try:
                        await update.message.forward(chat_id=gid)
                    except Exception as e:
                        print(f"Gagal forward ke {gid}: {e}")

        # simpan daftar grup
        groups = context.bot_data.setdefault("groups", set())
        if chat_id not in groups:
            groups.add(chat_id)
            print(f"✅ Grup baru terdaftar: {chat_id}")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🤖 Bot aktif! Postingan admin akan diforward ke grup lain.")

def main():
    if not TOKEN:
        raise ValueError("❌ BOT_TOKEN tidak ditemukan di Environment Variables.")

    app = Application.builder().token(TOKEN).build()

    app.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, forward_if_admin))
    app.add_handler(MessageHandler(filters.COMMAND, start))

    print("🚀 Bot sudah jalan polling...")
    app.run_polling()

if __name__ == "__main__":
    main()
