import os
from telegram import Update, ChatMember
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ===== KONFIGURASI =====
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

# Masukkan ID grup tujuan
TARGET_CHAT_IDS = [-1003038090571, -1002967257984, -1002996882426]

# ===== CEK ADMIN GRUP =====
async def is_user_admin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user_id = update.effective_user.id
    try:
        member = await context.bot.get_chat_member(chat.id, user_id)
        return member.status in ["administrator", "creator"]
    except Exception as e:
        print(f"[DEBUG] Gagal cek admin: {e}")
        return False

# ===== FUNGSI FORWARD =====
async def forward_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_user_admin(update, context):
        await update.message.reply_text("❌ Anda bukan admin grup!")
        print(f"[DEBUG] User {update.effective_user.id} bukan admin grup")
        return

    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        print("[DEBUG] Tidak ada reply, command ditolak")
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
            print(f"[DEBUG] Gagal forward ke {chat_id}: {e}")

    reply_text = ""
    if success:
        reply_text += f"✅ Berhasil di-forward ke: {', '.join(success)}\n"
    if failed:
        reply_text += f"❌ Gagal forward: {', '.join(failed)}"

    await update.message.reply_text(reply_text)
    print(f"[DEBUG] Forward done: {reply_text}")

# ===== MAIN - POLLING =====
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))

    print("Bot berjalan dengan polling...")
    app.run_polling()
