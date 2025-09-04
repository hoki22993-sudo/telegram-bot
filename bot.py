import os
import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# ===== KONFIGURASI =====
BOT_TOKEN = os.environ.get("BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("❌ BOT_TOKEN belum di-set di Environment Variables!")

# Masukkan Telegram User ID admin
ADMIN_IDS = [8327252807]  # Ganti dengan ID Anda

# Masukkan ID grup tujuan
TARGET_CHAT_IDS = [-1003038090571, -1002967257984, -1002996882426]

# ===== RESET WEBHOOK =====
def reset_webhook():
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
    r = requests.post(url)
    if r.status_code == 200:
        print("[INFO] Webhook dihapus, siap polling")
    else:
        print(f"[WARN] Gagal hapus webhook: {r.text}")

# ===== FUNGSI FORWARD =====
async def forward_reply(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    print(f"[DEBUG] Command received from user_id={user_id}")

    if user_id not in ADMIN_IDS:
        await update.message.reply_text("❌ Anda bukan admin!")
        print("[DEBUG] User bukan admin, command ditolak")
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
    reset_webhook()  # Hapus webhook lama sebelum polling

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("forward", forward_reply))

    print("Bot berjalan dengan polling...")
    app.run_polling()
