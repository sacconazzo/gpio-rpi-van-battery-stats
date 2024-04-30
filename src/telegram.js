require("dotenv").config();

const { Telegraf } = require("telegraf");
const { exec } = require("child_process");
const campera = require("./camera");

// Token bot Telegram from BotFather
const token = process.env.TELEGRAM_TOKEN;
const chatEnabled = (process.env.TELEGRAM_CHATS || "").split(",");
const bot = new Telegraf(token);

let isStarted = false;

const events = {};

// Start command
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
  try {
    const { id } = await ctx.getChat();

    if (!chatEnabled.includes(String(id))) {
      await ctx.reply("not authorized");
    } else {
      next();
    }
  } catch (e) {
    console.error(e);
  }
};

bot.use(isAuthorized);

bot.command("calibrate_a", async (ctx) => {
  try {
    await events.onCalibrateRequest();

    await ctx.reply("Current sensor recalibrate");

    console.log("Current sensor recalibrate");
  } catch (e) {
    console.error(e);
  }
});

bot.command("billy", async (ctx) => {
  try {
    const shutter = ctx.message.text.split(" ")[1];

    const source = await campera.picture({ shutter });

    await ctx.replyWithPhoto({ source });
    await campera.delete(source);

    console.log("Picture required");
  } catch (e) {
    console.error(e);
  }
});

bot.command("motion_on", async (ctx) => {
  try {
    campera.start({
      onMovement: async (source) => {
        try {
          await bot.telegram.sendPhoto(chatEnabled[0], { source });
          await campera.delete(source);

          console.log("Motion detected");
        } catch (e) {
          console.error(e);
        }
      },
    });

    await ctx.reply("Motion sensor ON");

    console.log("Motion sensor ON");
  } catch (e) {
    console.error(e);
  }
});

bot.command("motion_off", async (ctx) => {
  try {
    campera.stop();

    await ctx.reply("Motion sensor OFF");

    console.log("Motion sensor OFF");
  } catch (e) {
    console.error(e);
  }
});

bot.command("reboot", async (ctx) => {
  try {
    await ctx.reply("System reboot");

    setTimeout(() => exec("sudo reboot"), 3000);

    console.log("System reboot");
  } catch (e) {
    console.error(e);
  }
});

bot.command("poweroff", async (ctx) => {
  try {
    await ctx.reply("System power off");

    setTimeout(() => exec("sudo poweroff"), 3000);

    console.log("System poweroff");
  } catch (e) {
    console.error(e);
  }
});

module.exports = {
  start: (setup) => {
    events.onCalibrateRequest = setup.onCalibrateRequest;

    if (!isStarted) bot.launch();
    isStarted = true;
  },

  stop: campera.stop,
};
