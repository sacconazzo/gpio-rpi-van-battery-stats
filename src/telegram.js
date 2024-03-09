require("dotenv").config();

const { Telegraf } = require("telegraf");
const campera = require("./camera");

// Token del bot Telegram fornito da BotFather
const token = process.env.TELEGRAM_TOKEN;
const chatEnabled = (process.env.TELEGRAM_CHATS || "").split(",");
const bot = new Telegraf(token);

let isStarted = false;

// Ascolta il comando /start dal bot Telegram
bot.start((ctx) => {
  try {
    ctx.reply("😱");
  } catch {}
});

// Ascolta i comandi
bot.command("movement_on", async (ctx) => {
  const { id } = await ctx.getChat();
  try {
    if (!chatEnabled.includes(id)) ctx.reply("not authorized");
    campera.start({ onMovement });
    await ctx.reply("Sensor movement ON");
  } catch {}
});
bot.command("movement_off", async (ctx) => {
  const { id } = await ctx.getChat();
  try {
    if (!chatEnabled.includes(id)) ctx.reply("not authorized");
    campera(stop);
    await ctx.replyWithPhoto("Sensor movement OFF");
  } catch {}
});
bot.command("picture", async (ctx) => {
  // Invia la foto al chatId del mittente
  try {
    const source = campera.picture();
    await ctx.replyWithPhoto({ source });
    campera.delete(source);
  } catch {}
});

const onMovement = async (source) => {
  try {
    // Invia la foto alla chat abilitata
    await bot.telegram.sendPhoto(chatEnabled[0], { source });
    campera.delete(source);
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  start: () => {
    if (!isStarted) bot.launch();
    isStarted = true;
  },
  stop: campera.stop,
};
