require("dotenv").config();

const { Telegraf } = require("telegraf");
const { exec } = require("child_process");
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

const isAuthorized = async (ctx, next) => {
  const { id } = await ctx.getChat();
  try {
    if (!chatEnabled.includes(String(id))) {
      ctx.reply("not authorized");
    } else {
      next();
    }
  } catch (e) {
    console.error(e);
  }
};

// Ascolta i comandi
bot.command("billy", async (ctx) => {
  // Invia la foto al chatId del mittente
  try {
    const source = campera.picture();
    await ctx.replyWithPhoto({ source });
    campera.delete(source);
  } catch (e) {
    console.error(e);
  }
});
bot.use(isAuthorized);
bot.command("movement_on", async (ctx) => {
  try {
    campera.start({
      onMovement: async (source) => {
        // Invia la foto alla chat abilitata
        await bot.telegram.sendPhoto(chatEnabled[0], { source });
        campera.delete(source);
      },
    });
    await ctx.reply("Sensor movement ON");
  } catch (e) {
    console.error(e);
  }
});
bot.command("movement_off", async (ctx) => {
  try {
    campera.stop();
    await ctx.reply("Sensor movement OFF");
  } catch (e) {
    console.error(e);
  }
});
bot.command("reboot", async (ctx) => {
  try {
    await ctx.reply("System reboot");
    setTimeout(() => exec("sudo reboot", { stdio: "inherit" }), 2000);
  } catch (e) {
    console.error(e);
  }
});
bot.command("poweroff", async (ctx) => {
  try {
    await ctx.reply("System power off");
    setTimeout(() => exec("sudo poweroff", { stdio: "inherit" }), 2000);
  } catch (e) {
    console.error(e);
  }
});

module.exports = {
  start: () => {
    if (!isStarted) bot.launch();
    isStarted = true;
  },
  stop: campera.stop,
};