const db = require("../db");

// const OpenAIApi = require("openai");
// const apiKey = process.env.OPENAI_API_KEY;
// const openai = new OpenAIApi.OpenAI({ key: apiKey });

const axios = require("axios");
const LLM_URL = "http://localhost:11434/api/chat";

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

    const body = {
      model: process.env.AI_MODEL || "llama3.2:1b",
      messages: [
        {
          role: "system",
          content:
            "Fornisci dati in formato adatto ad un elaboratore. Ad ogni domanda rispondi solamente con i dettagli richiesti senza aggiungere altro",
        },
        {
          role: "user",
          content:
            "Ti fornirò un array in formato stringificato, avrà 2 campi, ch5 e ch6, rappresentano il valore grezzo ottenuto dai 2 sensori di corrente collegati rispettivamente a 2 batterie. " +
            // "Il campo ch7 è solo un dettaglio aggiuntivo, il valore grazzo da un termistore per quel determinato snapshot, la temperatura potrebbe influire con i valori dei sensori di corrente. " +
            "Uno snapshot ogni 20 secondi. l'ultimo elemento il più recente. " +
            "In linea teorica un valore a 0.5 indica che non c'è flusso di corrente, mentre discostando da quel valore significa che c'è assorbimento o ricarica. " +
            "Ipoteticamente: 0.6 significa ricarica di 10A; 0.4 assorbimento di 10A; 0.5, flusso di corrente di 0A. " +
            "I sensori sono collegati a 2 batterie al litio in un van e a pannello solare che potrebbe caricare o meno dipende dal sole e dallo stato di ricarica, le batterie sono anche collegate ai servizi del van. " +
            "Tendenzialmente i sensori subiscono un offset dal valore teorico di 0.5 ad assorbimento 0A e quindi, in fase di riposo, senza assorbimento o carica, il segnale che si riceve potrebbe non essere esattamente 0.5. " +
            "Ho necessità che tu mi analizzi gli array di valori e mi fornisca il valore più plausibile per indicare assorbimento 0A (mi aspetto circa 0.5 e compreso tra 0 e 1) ricalibrato considerando possibile offset, rispettivamente per entrambi i 2 set: ch5 e ch6. " +
            "Se non ricevi i valori di riferimento o non sei in grado di rispondere perchè non hai dati sufficienti, rispondi con 0",
        },
        {
          role: "user",
          content: JSON.stringify(signals),
        },
      ],
      stream: false,
      format: {
        type: "object",
        properties: {
          ch5: {
            type: "number",
          },
          ch6: {
            type: "number",
          },
        },
        required: ["ch5", "ch6"],
      },
      options: {
        temperature: 0,
        // num_predict: 60,
      },
    };

    // const completion = await openai.chat.completions.create(...)

    console.log(`LLM request: ${JSON.stringify(body)}`);

    const response = await axios.post(LLM_URL, body);

    console.log(`LLM response: ${JSON.stringify(response?.data?.message)}`);

    const calibration =
      response?.data?.message?.content?.length > 3
        ? JSON.parse(response.data.message.content)
        : [];
    // completion.choices[0]?.message?.content &&
    // completion.choices[0].message.content.includes(",")
    //   ? completion.choices[0].message.content.split(",")
    //   : [];

    return {
      OFFSET_A1: calibration ? Number(calibration.ch5).toFixed(4) : undefined,
      OFFSET_A2: calibration ? Number(calibration.ch6).toFixed(4) : undefined,
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
