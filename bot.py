import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ======== Konfigurasi ========
BOT_TOKEN = os.environ.get("BOT_TOKEN")  # Atau langsung masukkan token string
ADMIN_IDS = [8327252807]  # Ganti dengan Telegram ID admin
TARGET_CHAT_IDS = [-1003038090571, -1002967257984, -1002996882426]  # 3 ID grup

# ======== Fungsi Forward ========
async def forward_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS:
        await update.message.reply_text("❌ Anda bukan admin!")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        return

    success = []
    failed = []

    for chat_id in TARGET_CHAT_IDS:
        try:
            await context.bot.forward_message(
                chat_id=chat_id,
                from_chat_id=update.message.reply_to_message.chat.id,
                message_id=update.message.reply_to_message.message_id
            )
            success.append(str(chat_id))
        except Exception as e:
            failed.append(f"{chat_id} ({e})")

    reply_text = ""
    if success:
        reply_text += f"✅ Berhasil di-forward ke: {', '.join(success)}\n"
    if failed:
        reply_text += f"❌ Gagal forward: {', '.join(failed)}"

    await update.message.reply_text(reply_text)

# ======== Main ========
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))

    print("Bot berjalan...")
    app.run_polling()
