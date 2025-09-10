import os
import threading
import asyncio
from flask import Flask
from telegram import (
    Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup
)
from telegram.ext import (
    ApplicationBuilder, CommandHandler,
    ContextTypes, CallbackQueryHandler, MessageHandler, filters
)

# ================= CONFIG =================
BOT_TOKEN = os.environ.get("BOT_TOKEN") or "ISI_TOKEN_DI_SINI"

# Admin & grup forward
ADMIN_USER_ID = 1087968824
SOURCE_CHAT_ID = -1003038090571
TARGET_CHAT_IDS = [-1002967257984, -1002996882426]

# ================== START & MENU ==================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    username = f"@{user.username}" if user.username else user.first_name

    # Tombol inline (utama)
    keyboard = [
        [InlineKeyboardButton("📢 SUBSCRIBE CHANNEL", url="https://t.me/afb88my")],
        [InlineKeyboardButton("💬 GROUP CUCI & TIPS GAME", url="https://t.me/+b685QE242dMxOWE9")],
        [InlineKeyboardButton("🌐 REGISTER & LOGIN", url="https://afb88my1.com/")],
        [InlineKeyboardButton("🔞 AMOI VIDEO ", url="https://t.me/Xamoi2688")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Menu permanen (reply keyboard)
    reply_keyboard = [
        ["🌟 NEW REGISTER FREE 🌟"],
        ["📘 SHARE FACEBOOK 📘"],
        ["🔥 DAILY APPS FREE 🔥", "🌞 SOCIAL MEDIA 🌞"],
        ["🎉 TELEGRAM BONUS 🎉"]
    ]
    main_menu = ReplyKeyboardMarkup(reply_keyboard, resize_keyboard=True)

    # Gambar (bisa photo/gif)
    media_type = "gif"  # ubah ke "gif" jika mau gif
    media_url = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3ZudGg2bTVteGx2N3EwYng4a3ppMnhlcmltN2p2MTVweG1laXkyZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/tXSLbuTIf37SjvE6QY/giphy.gif"

    if media_type == "gif":
        await update.message.reply_animation(
            animation=media_url,
            caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                    f"Sila join group2 yang saya share dulu. Pastikan anda dapat REZEKI di group2 saya ❤️",
            reply_markup=reply_markup
        )
    else:
        await update.message.reply_photo(
            photo=media_url,
            caption=f"👋 Hi {username}, \n\nBossku 😘 Kalau anda sudah subscribe saya, saya pasti kasi anda untungan yg terbaik!! "
                    f"Sila join group2 yang saya share dulu. Pastikan anda dapat REZEKI di group2 saya ❤️",
            reply_markup=reply_markup
        )

    await update.message.reply_text("➤ CLICK /start TO BACK MENU:", reply_markup=main_menu)

# ================== REPLY MENU ==================
async def reply_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text

    menu_data = {
        "🌟 NEW REGISTER FREE 🌟": {
            "url": "https://afb88my1.com/promotion",
            "media_type": "photo",
            "media": "https://ibb.co/BK2LVQ6t",
            "caption": """🌟 NEW REGISTER BONUS 🌟

⚠️ LANGGAR SYARAT AKAN FORFEITED SEMUA POINT ⚠️

✅ Keperluan SLOT ONLY

✅ Free Credit RM88  
✅ Min WD/CUCI RM2000  
✅ Max Payment/WD RM40  
✅ BELOW CREDIT RM 0.10 
✅ Dibenarkan Main MEGAH5|EPICWIN|PXPLAY2|ACEWIN2|RICH GAMING ( EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM MESTI DOWNLOAD APPS UNTUK CLAIM CLICK LINK: https://afb88.hfcapital.top/

⚠️ 1 NAMA 1 ID SAHAJA,TIDAK BOLEH  
GUNA NAMA YANG SAMA UNTUK TUNTUT  
BONUS INI 
⚠️ NAMA DAFTAR MESTI SAMA DENGAN NAMA AKAUN BANK  
AKAUN BANK TIDAK BOLEH DIUBAH SELEPAS DAFTAR 

➤ CLICK /start TO BACK MENU"""
        },
        "📘 SHARE FACEBOOK 📘": {
            "url": "https://afb88my1.com/promotion",
            "media_type": "photo",
            "media": "https://ibb.co/Z6B55VcX",
            "caption": """📘 SHARE FACEBOOK 📘

🧧 FREE CREDIT RM68 🧧  

✅ STEP 1: Join Our Telegram Channel LINK JOIN:t.me/afb88my
✅ STEP 2: Join Our Facebook Group LINK JOIN: https://www.facebook.com/share/g/1GGcZKo6zN/
➡️ How To Claim Free Credit: Share Post To 5 Casino Group 3 Link
➡️ Had Tuntutan : DAILY CLAIM X1
✅ Dibenarkan Main : MEGAH5|EPICWIN|PXPLAY|ACEWIN2|RICH GAMING (EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM MESTI DOWNLOAD APPS UNTUK CLAIM CLICK LINK: https://afb88.hfcapital.top/
️ 1 NAMA 1 ID SAHAJA,TIDAK BOLEH  
GUNA NAMA YANG SAMA UNTUK TUNTUT  
BONUS INI 
⚠️ NAMA DAFTAR MESTI SAMA DENGAN NAMA AKAUN BANK  
AKAUN BANK TIDAK BOLEH DIUBAH SELEPAS DAFTAR 

➤ CLICK /start TO BACK MENU"""
        },
        "🔥 DAILY APPS FREE 🔥": {
            "url": "https://afb88my1.com/promotion",
            "media_type": "photo",
            "media": "https://ibb.co/nsmVQFbg",
            "caption": """🔥 DAILY APPS FREE 🔥

🎁 Free Credit RM20 

📌 Had Tuntutan Daily Claim X1
💰 Min. Withdraw RM 600  
💳 Max. Payment RM 10  
💰 Below Credit RM 0.10
✅ Dibenarkan Main : MEGAH5|EPICWIN|PXPLAY|ACEWIN2|RICH GAMING (EVENT GAME ONLY)
✅ DOWNLOAD APPS UNTUK CLAIM MESTI DOWNLOAD APPS UNTUK CLAIM CLICK LINK: https://afb88.hfcapital.top/

⚠️ XDAPAT REKOMEN SENDIRI,BANK ACCOUNT/NAMA INFO SALAH AKAN FORFEITED SEMUA POINT 

➤ CLICK /start TO BACK MENU"""
        },
        "🌞 SOCIAL MEDIA 🌞": {
            "url": "https://afb88my1.com/promotion",
            "media_type": "photo",
            "media": "https://ibb.co/HfyD6DWw",
            "caption": """🌞 SOCIAL MEDIA 🌞

📌FOLLOW SOCIAL MEDIA:  

📘 Facebook: https://www.facebook.com/profile.php?id=61579884569151  
📸 Instagram: https://instagram.com/afb88  
🎥 WhatsApp Group: https://wa.me/+601133433880

🎯 Dapatkan maklumat acara terkini, bonus dan kemas kini 

➤ CLICK /start TO BACK MENU!"""
        },
        "🎉 TELEGRAM BONUS 🎉": {
            "url": "https://afb88my1.com/promotion",
            "media_type": "photo",
            "media": "https://ibb.co/21qTqmtY",
            "caption": """🎉 TELEGRAM BONUS 🎉

🎁 SUBSCRIBE TELEGRAM BONUS:  
✅ Free Credit RM 30
✅ Had Tuntutan X1
✅ Min.Withdraw RM 888
✅ Max.Payment RM 15
✅ Join Telegram Channel :https://t.me/afb88my
❌ TIDAK BOLEH DIGABUNG: TOP UP/REBATE/FREE/CREDIT/COMMISION BONUS

👉 CLICK CLAIM NOW 

➤ CLICK /start TO BACK MENU"""
        },
    }

    if text in menu_data:
        keyboard = [[InlineKeyboardButton("CLAIM 🎁", url=menu_data[text]["url"])]]
        reply_markup = InlineKeyboardMarkup(keyboard)

        media_type = menu_data[text].get("media_type", "photo")
        media = menu_data[text].get("media")

        if media_type == "gif":
            await update.message.reply_animation(
                animation=media,
                caption=menu_data[text]["caption"],
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_photo(
                photo=media,
                caption=menu_data[text]["caption"],
                reply_markup=reply_markup
            )

# ================== INLINE BUTTON ==================
async def button(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "profile":
        await query.edit_message_text("👤 Ini adalah menu profil kamu.")

# ================== FORWARD COMMAND ==================
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id

    if user_id != ADMIN_USER_ID:
        await update.message.reply_text("❌ Anda bukan admin yang diizinkan!")
        return

    if chat_id != SOURCE_CHAT_ID:
        await update.message.reply_text("❌ Command hanya bisa digunakan di grup utama!")
        return

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

    if failed:
        await update.message.reply_text(f"❌ Gagal forward: {', '.join(failed)}")

# ================== AUTO REPOST (HANYA ADMIN DI GRUP) ==================
async def auto_repost(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id

    if chat_id == SOURCE_CHAT_ID and user_id == ADMIN_USER_ID:
        keyboard = [
            [InlineKeyboardButton("🎮 Register", url="https://afb88my1.com/register/SMSRegister"),
             InlineKeyboardButton("🌐 Login", url="https://afb88my1.com/")],
            [InlineKeyboardButton("▶️ Join Channel 1", url="t.me/afb88my"),
             InlineKeyboardButton("▶️ Join Channel 2", url="t.me/afb88casinomy")],
            [InlineKeyboardButton("▶️ Group Sembang", url="https://t.me/+b685QE242dMxOWE9"),
             InlineKeyboardButton("🎁 Bonus Claim!", url="https://afb88my1.com/promotion")],
            [InlineKeyboardButton("📱 Facebook", url="https://www.facebook.com/profile.php?id=61579884569151"),
             InlineKeyboardButton("📱 FB Group", url="https://www.facebook.com/groups/772875495480578")],
            [InlineKeyboardButton("📞 WhatsApp", url="https://wa.me/+601133433880"),
             InlineKeyboardButton("🔞 Amoi Video", url="https://t.me/Xamoi2688")],
            [InlineKeyboardButton("🔗 Link Syok", url="https://heylink.me/AFB88casino"),
             InlineKeyboardButton("🤖 BOT AFB88", url="https://t.me/afb88_bot")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        try:
            await update.message.delete()

            if update.message.photo:
                file_id = update.message.photo[-1].file_id
                await context.bot.send_photo(chat_id=chat_id, photo=file_id, caption=update.message.caption or "", reply_markup=reply_markup)
            elif update.message.video:
                file_id = update.message.video.file_id
                await context.bot.send_video(chat_id=chat_id, video=file_id, caption=update.message.caption or "", reply_markup=reply_markup)
            elif update.message.animation:
                file_id = update.message.animation.file_id
                await context.bot.send_animation(chat_id=chat_id, animation=file_id, caption=update.message.caption or "", reply_markup=reply_markup)
            elif update.message.text:
                await context.bot.send_message(chat_id=chat_id, text=update.message.text, reply_markup=reply_markup)
        except Exception as e:
            print("Error auto_repost:", e)

# ================== FLASK HEALTH (KEEP-ALIVE) ==================
flask_app = Flask(__name__)

@flask_app.route("/")
def home():
    return "✅ Bot is running"

def run_flask():
    port = int(os.environ.get("PORT", 10000))
    # Use Flask's built-in server as a simple health endpoint for uptime monitors.
    flask_app.run(host="0.0.0.0", port=port)

# ================== MAIN (async) ==================
async def main():
    # start flask in a separate daemon thread so it doesn't block asyncio loop
    threading.Thread(target=run_flask, daemon=True).start()

    app = ApplicationBuilder().token(BOT_TOKEN).build()

    # Commands
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("menu", start))
    app.add_handler(CommandHandler("about", start))
    app.add_handler(CommandHandler("profile", start))
    app.add_handler(CommandHandler("contact", start))
    app.add_handler(CommandHandler("forward", forward_command))

    # Handlers
    app.add_handler(CallbackQueryHandler(button))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND & filters.ChatType.PRIVATE, reply_menu))

    # auto repost dengan tombol (khusus admin di grup utama)
    app.add_handler(MessageHandler(
        (filters.ChatType.GROUP | filters.ChatType.SUPERGROUP) & (filters.TEXT | filters.PHOTO | filters.VIDEO | filters.ANIMATION),
        auto_repost
    ))

    print("🤖 Bot sudah jalan... (polling + health endpoint)")
    # run_polling is async in PTB v20; await it inside asyncio.run()
    await app.run_polling()

if __name__ == "__main__":
    asyncio.run(main())
