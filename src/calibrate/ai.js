const db = require("../db");
const axios = require("axios");
// const OpenAIApi = require("openai");

// const apiKey = process.env.OPENAI_API_KEY;
// const openai = new OpenAIApi.OpenAI({ key: apiKey });

const aai = async () => {
  try {
    const [signals] = await db.raw(
      `SELECT\
      ch5, ch6\
    FROM\
    \`adc-snaps\`\
    WHERE\
      timestamp> (NOW() - INTERVAL ${process.env.AI_MINUTES} MINUTE)\
    ORDER BY\
      id ASC;`
    );

    // const completion = await openai.chat.completions.create({
    const body = {
      model: "llama3.2:1b",
      messages: [
        {
          role: "system",
          content:
            "Fornisci dati in formato adatto ad un elaboratore. Ad ogni domanda rispondi solamente con i dettagli richiesti senza aggiungere altro",
        },
        {
          role: "user",
          content:
            "Ti fornirò un array in formato stringificato, avrà 2 campi, ch5 e ch6, rappresentano il valore grezzo dei sensori di corrente. " +
            // "Il campo ch7 è solo un dettaglio aggiuntivo, il valore grazzo da un termistore per quel determinato snapshot, la temperatura potrebbe influire con i valori dei sensori di corrente. " +
            "Uno snapshot ogni 20 secondi. l'ultimo elemento il più recente. " +
            "In linea teorica un valore vicino a 0.5 indica che non c'è flusso di corrente, mentre spostandosi da quel valore potrebbe esserci assorbimento o ricarica. " +
            "I sensori sono collegati a 2 batterie al litio in un van e a pannello solare che potrebbe caricare o meno dipende dal sole e dallo stato di ricarica, le batterie sono anche collegati ai servizi del van. " +
            "Tendenzialmente i sensori subiscono un offset dallo 0 e quindi, in fase di riposo, senza assorbimento o carica, il segnale che si riceve potrebbe subire delle variazioni. " +
            "Ho necessità che tu mi analizzi l'array di valori e mi suggerisci il valore attuale di 0 ricalibrato per entrambi i 2 set: ch5 e ch6. " +
            "la risposta deve essere 2 valori numerici semplici separati da virgola e nient'altro che rappresentino ch5 e ch6. Se non ricevi i valori di riferimento o non sei in grado di rispondere perchè non hai dati sufficienti, rispondi con 0",
        },
        {
          role: "user",
          content: JSON.stringify(signals),
        },
      ],
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 60,
      },
    };

    console.log(`LLM request: ${JSON.stringify(body)}`);

    const response = await axios.post("http://localhost:11434/api/chat", body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`LLM response: ${JSON.stringify(response?.data?.message)}`);

    const calibration =
      response?.data?.message?.content?.length > 3
        ? JSON.parse(response.data.message.content).split(",")
        : [];
    // completion.choices[0]?.message?.content &&
    // completion.choices[0].message.content.includes(",")
    //   ? completion.choices[0].message.content.split(",")
    //   : [];

    return {
      OFFSET_A1: calibration[0] ? Number(calibration[0]).toFixed(4) : undefined,
      OFFSET_A2: calibration[1] ? Number(calibration[1]).toFixed(4) : undefined,
    };
  } catch (e) {
    console.log(e.message);
    return {
      OFFSET_A1: undefined,
      OFFSET_A2: undefined,
    };
  }
};

module.exports = aai;

// aai().then((s) => console.log(s));
