// index.js
require("dotenv").config();
const db = require("./db");
const OpenAIApi = require("openai");

// Carica la chiave API dalle variabili di ambiente
const apiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAIApi.OpenAI({ key: apiKey });

async function main() {
  const [signals] = await db.raw(
    `SELECT\
      ch5, ch6\
    FROM\
    \`adc-snaps\`\
    WHERE\
      timestamp> (NOW() - INTERVAL ${process.env.REALTIME_MINUTES} MINUTE)\
    ORDER BY\
      id ASC;`
  );

  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "Sei un assistente che deve fornire dati in formato non testiale ma in un formato adatto ad un elaboratore. Ad ogni domanda rispondi solamente con i dettagli richiesti senza aggiungere altro",
      },
      {
        role: "user",
        content:
          "Ti fornirò un array in formato stringificato, avrà 2 campi, ch5 e ch6, rappresentano il valore grezzo dei sensori di corrente. " +
          "In linea teorica un valore vicino a 0.5 indica che non c'è flusso di corrente, mentre spostandosi da quel valore potrebbe esserci assorbimento o ricarica. " +
          "I sensori sono collegati a 2 batterie al litio in un van e a pannello solare che potrebbe caricare o meno dipende dal sole e dallo stato di ricarica, le batterie sono anche collegati ai servizi del van. " +
          "Tendenzialmente i sensori subiscono un offset dello 0 e quindi in fase di riposo, senza assorbimento o carica, il valore che lo rappresenta si scosta. " +
          "Ho necessità che tu mi analizzi l'array di valori e mi suggerisci il valore attuale di 0 ricalibrato per entrambi i 2 set ch5 e ch6. " +
          "la risposta deve essere 2 valori numerici semplici separati da virgola e nient'altro che rappresentino ch5 e ch6. Se non sei in grado di rispondere restituisci con stringa vuota.",
      },
      {
        role: "assistant",
        content: JSON.stringify(signals),
      },
    ],
    max_tokens: 60,
    model: "gpt-4-turbo",
  });

  console.log(completion.choices[0]);
}
main();
