import os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

TOKEN = os.getenv("BOT_TOKEN")
APP_URL = os.getenv("APP_URL")  # isi dengan URL dari Render (misalnya https://mybot.onrender.com)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🤖 Bot aktif dengan webhook!")

async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"Kamu kirim: {update.message.text}")

def main():
    if not TOKEN or not APP_URL:
        raise ValueError("❌ BOT_TOKEN atau APP_URL belum di-set di Environment Variables!")

    app = Application.builder().token(TOKEN).build()

    # handler command & pesan
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    # jalankan webhook
    port = int(os.environ.get("PORT", 10000))
    app.run_webhook(
        listen="0.0.0.0",
        port=port,
        url_path=TOKEN,
        webhook_url=f"{APP_URL}/{TOKEN}"
    )

if __name__ == "__main__":
    main()
