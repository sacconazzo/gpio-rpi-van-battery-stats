// index.js
require("dotenv").config();
const OpenAIApi = require("openai");

// Carica la chiave API dalle variabili di ambiente
const apiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAIApi.OpenAI({ key: apiKey });

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: "Chi ha vinto il campionato di formula1 nel 1998?",
      },
      // {
      //   role: "assistant",
      //   content: "The Los Angeles Dodgers won the World Series in 2020.",
      // },
      // { role: "user", content: "Where was it played?" },
    ],
    max_tokens: 60,
    model: "gpt-3.5-turbo",
  });

  console.log(completion.choices[0]);
}
main();
