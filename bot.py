import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

BOT_TOKEN = os.environ.get("BOT_TOKEN")

async def check_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    await update.message.reply_text(f"ID Anda adalah: {user_id}")
    print(f"[DEBUG] User ID: {user_id}")

if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("checkid", check_id))
    app.run_polling()
