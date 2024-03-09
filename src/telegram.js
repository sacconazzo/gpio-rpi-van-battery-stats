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
bot.start(async (ctx) => {
  try {
    await ctx.reply("😱");

    const { id } = await ctx.getChat();
    console.log(`new client ${id}`);
  } catch (e) {
    console.error(e);
  }
});

const isAuthorized = async (ctx, next) => {
  const { id } = await ctx.getChat();

  try {
    if (!chatEnabled.includes(String(id))) {
      await ctx.reply("not authorized");
    } else {
      next();
    }
  } catch (e) {
    console.error(e);
  }
};

// Ascolta i comandi
bot.use(isAuthorized);

bot.command("billy", async (ctx) => {
  // Invia la foto al chatId del mittente
  try {
    const source = campera.picture();

    await ctx.replyWithPhoto({ source });
    campera.delete(source);

    console.log("Picture required");
  } catch (e) {
    console.error(e);
  }
});

bot.command("movement_on", async (ctx) => {
  try {
    campera.start({
      onMovement: async (source) => {
        // Invia la foto alla chat abilitata
        await bot.telegram.sendPhoto(chatEnabled[0], { source });
        campera.delete(source);

        console.log("Movement received");
      },
    });

    await ctx.reply("Sensor movement ON");

    console.log("Sensor movement ON");
  } catch (e) {
    console.error(e);
  }
});

bot.command("movement_off", async (ctx) => {
  try {
    campera.stop();

    await ctx.reply("Sensor movement OFF");

    console.log("Sensor movement OFF");
  } catch (e) {
    console.error(e);
  }
});

bot.command("reboot", async (ctx) => {
  try {
    // await ctx.reply("System reboot");

    setTimeout(() => exec("sudo reboot"), 2000);

    console.log("System reboot");
  } catch (e) {
    console.error(e);
  }
});

bot.command("poweroff", async (ctx) => {
  try {
    // await ctx.reply("System power off");

    setTimeout(() => exec("sudo poweroff"), 2000);

    console.log("System poweroff");
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
