import os
from telegram import Update, Message
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

# ========================
# KONFIGURASI
# ========================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
ADMIN_IDS = [8327252807]  # ID admin
SOURCE_CHAT_ID = -1003038090571  # ID grup/channel sumber
TARGET_CHAT_IDS = [
    -1002967257984,
    -1002996882426
]

# Keyword filter (optional)
KEYWORDS = ["jackpot", "promo", "info"]
ENABLE_KEYWORD_FILTER = False

# ========================
# COMMANDS
# ========================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if update.effective_user.id in ADMIN_IDS:
        await context.bot.send_message(chat_id=chat_id, text="Bot siap! Gunakan /forward untuk aktifkan forwarding.")
    else:
        await context.bot.send_message(chat_id=chat_id, text="Anda bukan admin.")

async def forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if update.effective_user.id not in ADMIN_IDS:
        await context.bot.send_message(chat_id=chat_id, text="Anda tidak punya akses.")
        return
    context.application.bot_data['forwarding'] = True
    await context.bot.send_message(chat_id=chat_id, text="Forwarding diaktifkan ✅")

async def stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if update.effective_user.id not in ADMIN_IDS:
        await context.bot.send_message(chat_id=chat_id, text="Anda tidak punya akses.")
        return
    context.application.bot_data['forwarding'] = False
    await context.bot.send_message(chat_id=chat_id, text="Forwarding dihentikan ❌")

# ========================
# AUTO FORWARD
# ========================
async def auto_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.application.bot_data.get('forwarding', False):
        return

    msg: Message = update.message
    if update.effective_chat.id != SOURCE_CHAT_ID:
        return

    if ENABLE_KEYWORD_FILTER and msg.text:
        if not any(keyword.lower() in msg.text.lower() for keyword in KEYWORDS):
            print(f"[SKIPPED] Pesan ID {msg.message_id} tidak mengandung keyword")
            return

    try:
        for target_id in TARGET_CHAT_IDS:
            if msg.text:
                await context.bot.send_message(chat_id=target_id, text=msg.text)
            elif msg.photo:
                await context.bot.send_photo(chat_id=target_id, photo=msg.photo[-1].file_id, caption=msg.caption)
            elif msg.video:
                await context.bot.send_video(chat_id=target_id, video=msg.video.file_id, caption=msg.caption)
            elif msg.document:
                await context.bot.send_document(chat_id=target_id, document=msg.document.file_id, caption=msg.caption)
        print(f"[FORWARDED] Pesan ID {msg.message_id} ke {len(TARGET_CHAT_IDS)} target")
    except Exception as e:
        print(f"Error forwarding: {e}")

# ========================
# MAIN
# ========================
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("forward", forward))
    app.add_handler(CommandHandler("stop", stop))
    app.add_handler(MessageHandler(filters.ALL, auto_forward))

    print("Bot berjalan...")
    app.run_polling()
