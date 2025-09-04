import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ================= CONFIG =================
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

# Hanya user ini yang bisa forward
ADMIN_USER_ID = 1087968824  # ganti dengan User ID Anda

# Grup sumber (hanya pesan dari sini yang bisa di-forward)
SOURCE_CHAT_ID = -1003038090571  # ganti dengan ID grup utama

# Grup tujuan
TARGET_CHAT_IDS = [
    -1002967257984,
    -1002996882426
]

# ================== FORWARD FUNCTION ==================
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id

    print(f"[DEBUG] Chat ID: {chat_id}, User ID: {user_id}")

    # cek user ID
    if user_id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Anda bukan admin yang diizinkan!")
        return

    # cek grup sumber
    if chat_id != SOURCE_CHAT_ID:
        await update.message.reply_text("❌ Command hanya bisa digunakan di grup utama!")
        return

    # cek reply
    if not update.message.reply_to_message:
        await update.message.reply_text("❌ Reply ke pesan yang ingin di-forward.")
        return

    failed = []

    for target_id in TARGET_CHAT_IDS:
        try:
            await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=update.message.reply_to_message.chat.id,
                message_id=update.message.reply_to_message.message_id
            )
        except Exception as e:
            failed.append(f"{target_id} ({e})")
            print(f"[DEBUG] Gagal forward ke {target_id}: {e}")

    # hanya tampilkan jika ada gagal
    if failed:
        await update.message.reply_text(f"❌ Gagal forward: {', '.join(failed)}")

    print("[DEBUG] Forward selesai")

# ================== MAIN ==================
if __name__ == "__main__":
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_command))
    print("Bot polling berjalan...")
    app.run_polling()
