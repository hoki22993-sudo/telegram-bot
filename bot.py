import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

BOT_TOKEN = os.environ.get("BOT_TOKEN")
TARGET_CHAT_IDS = [-1003038090571, -1002967257984, -1002996882426]

async def forward_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    chat_id = update.effective_chat.id

    # cek admin grup
    try:
        member = await context.bot.get_chat_member(chat_id, user_id)
        if member.status not in ["administrator", "creator"]:
            await update.message.reply_text("❌ Anda bukan admin grup!")
            return
    except Exception as e:
        print(f"[DEBUG] Gagal cek admin: {e}")
        await update.message.reply_text("❌ Gagal cek status admin!")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        return

    success, failed = [], []
    for target_id in TARGET_CHAT_IDS:
        try:
            await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=update.message.reply_to_message.chat.id,
                message_id=update.message.reply_to_message.message_id
            )
            success.append(str(target_id))
        except Exception as e:
            failed.append(f"{target_id} ({e})")
            print(f"[DEBUG] Gagal forward ke {target_id}: {e}")

    reply = ""
    if success: reply += f"✅ Berhasil di-forward ke: {', '.join(success)}\n"
    if failed: reply += f"❌ Gagal forward: {', '.join(failed)}"
    await update.message.reply_text(reply)

if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))
    print("Bot polling berjalan...")
    app.run_polling()
