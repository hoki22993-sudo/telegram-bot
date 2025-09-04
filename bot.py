import os
import json
import asyncio
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from telegram.error import TimedOut, TelegramError
from aiohttp import web

BOT_TOKEN = os.environ.get("BOT_TOKEN")
APP_URL = os.environ.get("APP_URL")
PORT = int(os.environ.get("PORT", 8443))
MAPPING_FILE = "forwarded_messages.json"

if not BOT_TOKEN or not APP_URL:
    raise ValueError("BOT_TOKEN atau APP_URL belum di-set!")

SOURCE_GROUPS = [-1003038090571]
TARGET_GROUPS = [-1002967257984, -1002996882426]

# Load mapping
if os.path.exists(MAPPING_FILE):
    with open(MAPPING_FILE, "r") as f:
        forwarded_messages = json.load(f)
else:
    forwarded_messages = {}

def save_mapping():
    with open(MAPPING_FILE, "w") as f:
        json.dump(forwarded_messages, f)

# Forward via reply
async def forward_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user
    if chat.id not in SOURCE_GROUPS:
        return
    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        return
    if not update.message.reply_to_message:
        return
    message_id = update.message.reply_to_message.message_id
    str_chat_id = str(chat.id)
    str_msg_id = str(message_id)
    forwarded_messages.setdefault(str_chat_id, {})
    forwarded_messages[str_chat_id].setdefault(str_msg_id, {})
    for target_id in TARGET_GROUPS:
        try:
            msg = await context.bot.forward_message(
                chat_id=target_id,
                from_chat_id=chat.id,
                message_id=message_id
            )
            forwarded_messages[str_chat_id][str_msg_id][str(target_id)] = msg.message_id
            await asyncio.sleep(0.3)
        except Exception as e:
            print(f"Gagal forward: {e}")
    save_mapping()

# Delete forward
async def delete_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat = update.effective_chat
    user = update.effective_user
    member = await chat.get_member(user.id)
    if member.status not in ["administrator", "creator"]:
        return
    if len(context.args) != 1:
        return
    message_id = context.args[0]
    str_chat_id = str(chat.id)
    if str_chat_id not in forwarded_messages or message_id not in forwarded_messages[str_chat_id]:
        return
    for target_id, fwd_msg_id in forwarded_messages[str_chat_id][message_id].items():
        try:
            await context.bot.delete_message(chat_id=int(target_id), message_id=int(fwd_msg_id))
        except Exception as e:
            print(f"Gagal hapus: {e}")
    del forwarded_messages[str_chat_id][message_id]
    save_mapping()

# ===============================
# Setup bot dan webhook aiohttp
# ===============================
app = ApplicationBuilder().token(BOT_TOKEN).build()
app.add_handler(CommandHandler("forward", forward_command))
app.add_handler(CommandHandler("delete", delete_forward))

async def handle(request):
    data = await request.json()
    update = Update.de_json(data, app.bot)
    await app.update_queue.put(update)
    return web.Response(text="ok")

async def on_startup(app_server):
    webhook_url = f"{APP_URL}/webhook/{BOT_TOKEN}"
    await app.bot.set_webhook(webhook_url)
    print(f"Webhook aktif: {webhook_url}")

web_app = web.Application()
web_app.router.add_post(f"/webhook/{BOT_TOKEN}", handle)
web_app.on_startup.append(on_startup)

print("Bot siap menerima webhook...")
web.run_app(web_app, host="0.0.0.0", port=PORT)
