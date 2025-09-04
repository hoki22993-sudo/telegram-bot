import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ======== Konfigurasi ========
BOT_TOKEN = os.environ.get("BOT_TOKEN")  # Isi token di Environment Variables
ADMIN_IDS = [8327252807]  # Telegram User ID admin
TARGET_CHAT_IDS = [-1003038090571, -1002967257984, -1002996882426]  # 3 grup tujuan

# ======== Fungsi Forward ========
async def forward_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    if user_id not in ADMIN_IDS:
        await update.message.reply_text("❌ Anda bukan admin!")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        return

    for chat_id in TARGET_CHAT_IDS:
        try:
            await context.bot.forward_message(
                chat_id=chat_id,
                from_chat_id=update.message.reply_to_message.chat.id,
                message_id=update.message.reply_to_message.message_id
            )
        except:
            pass  # Abaikan error kecil, biar cepat

    await update.message.reply_text("✅ Pesan berhasil di-forward!")

# ======== Main ========
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))

    print("Bot berjalan... (polling mode, Render akan kasih warning port, abaikan saja)")
    app.run_polling()
