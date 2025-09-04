import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ======== KONFIGURASI ========
BOT_TOKEN = os.environ.get("BOT_TOKEN")  # Isi di Environment Variables
ADMIN_IDS = [8327252807]  # Telegram User ID admin
TARGET_CHAT_IDS = [-1003038090571, -1002967257984, -1002996882426]  # ID grup tujuan

# ======== FUNGSI FORWARD ========
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

# ======== MAIN - WEBHOOK UNTUK RENDER ========
if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 8443))        # Render menyediakan environment variable PORT
    APP_URL = os.environ.get("APP_URL")             # URL Render Anda misal: https://namaproject.onrender.com

    if not BOT_TOKEN or not APP_URL:
        raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))

    print("Bot berjalan dengan webhook...")
    app.run_webhook(
        listen="0.0.0.0",
        port=PORT,
        webhook_url=f"{APP_URL}/webhook/{BOT_TOKEN}"
    )
