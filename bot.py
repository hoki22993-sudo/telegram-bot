import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ===== KONFIGURASI =====
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

# Grup asal (hanya pesan dari sini yang bisa di-forward)
SOURCE_CHAT_IDS = [-1003038090571]  # Ganti dengan ID grup utama

# Grup tujuan
TARGET_CHAT_IDS = [-1002967257984, -1002996882426]

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
    chat_id = update.effective_chat.id

    # cek grup asal
    if chat_id not in SOURCE_CHAT_IDS:
        await update.message.reply_text("❌ Pesan hanya bisa di-forward dari grup utama!")
        return

    # cek admin
    if not await is_user_admin(update, context):
        await update.message.reply_text("❌ Anda bukan admin grup!")
        return

    # cek reply
    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        return

    # forward ke target
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
    print(f"[DEBUG] Forward done: {reply}")

# ===== MAIN =====
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))
    print("Bot polling berjalan...")
    app.run_polling()
