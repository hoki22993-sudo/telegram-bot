from telegram.ext import MessageHandler, filters

async def print_chat_id(update, context):
    chat_id = update.effective_chat.id
    await update.message.reply_text(f"Chat ID grup/channel ini: {chat_id}")
    print("Chat ID:", chat_id)  # muncul juga di log Render

# Tambahkan handler ini ke aplikasi
app.add_handler(MessageHandler(filters.ALL & (~filters.StatusUpdate.ALL), print_chat_id))
