// Requiere Node.js 18+ para usar fetch
const twilio = require("twilio");

// Credenciales Twilio (no expongas estas en producción)
const TWILIO_SID = "AC02b10786797264dcac955b4fd7ff7c3a";
const TWILIO_TOKEN = "595d9d5dbd0b29a9d797f8ff09c35124";
const TWILIO_NUMBER = "+12187572497";
const DESTINATION_NUMBER = "+523891089322"; // Número destino

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

/**
 * Simula la generación de una factura electrónica (datos ficticios).
 * @param {Object} inputData - Datos ingresados por el usuario.
 * @returns {Object} Datos simulados de la factura.
 */
function generateFakeInvoice(inputData) {
  return {
    invoiceId: "FAKE-INV-001",
    customer: {
      id: inputData.customerId || "CUST-DEFAULT",
      name: inputData.customerName || "Cliente de Prueba",
    },
    items: inputData.items || [],
    total: inputData.items
      ? inputData.items.reduce((sum, item) => sum + (item.total || 0), 0)
      : 0,
    currency: "MXN",
    use: inputData.use || "G01 - Adquisición de mercancías",
    paymentForm: inputData.paymentForm || "01 - Efectivo",
    paymentMethod:
      inputData.paymentMethod || "PUE - Pago en una sola exhibición",
    date: new Date().toISOString(),
  };
}

/**
 * Genera un resumen sencillo de la factura utilizando un modelo de IA (Gemini).
 * @param {Object} invoiceData - Datos de la factura (simulados).
 * @param {Object} originalInput - Datos originales ingresados por el usuario.
 * @returns {Promise<string>} El resumen generado por la IA.
 */
async function generateInvoiceSummary(invoiceData, originalInput) {
  try {
    const prompt = `
Redacta un resumen breve, máximo 3 oraciones y menos de 50 palabras, en español, fácil de entender y con lenguaje claro y directo.
Incluye: nombre del cliente, total con moneda, uso, forma y método de pago, y lista de artículos.

Cliente: ${originalInput.customerName || "No especificado"} (ID: ${
      originalInput.customerId
    })
Total: ${invoiceData.total || "No especificado"} ${invoiceData.currency || ""}
Uso: ${originalInput.use || "No especificado"}
Forma de pago: ${originalInput.paymentForm || "No especificado"}
Método de pago: ${originalInput.paymentMethod || "No especificado"}
Artículos:
${
  originalInput.items && originalInput.items.length > 0
    ? originalInput.items
        .map(
          (item) =>
            `- ${item.quantity}x ${item.productId} (Unit: $${item.unitPrice}, Total: $${item.total})`
        )
        .join("\n")
    : "No hay artículos."
}
`;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };

    const apiKey = "AIzaSyB1Z0CnBQzLIkjZFFvpEo46fLUy9gKJmyA"; // <-- Reemplaza si usas una clave diferente
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    console.log(
      "Enviando solicitud a la API de Gemini para generar resumen..."
    );
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Error en la API de Gemini: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const result = await response.json();
    console.log("Resumen recibido desde Gemini.");

    const resumen =
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No se pudo generar un resumen.";

    return resumen;
  } catch (err) {
    console.error("Error al generar el resumen de la factura con IA:", err);
    return `Error al generar el resumen con IA: ${err.message}`;
  }
}

/**
 * Envía un SMS con el resumen de la factura utilizando Twilio.
 * @param {string} message - Texto del mensaje a enviar.
 */
async function sendSms(message) {
  try {
    const messageResponse = await twilioClient.messages.create({
      body: message,
      from: TWILIO_NUMBER,
      to: DESTINATION_NUMBER,
    });
    console.log(`SMS enviado con SID: ${messageResponse.sid}`);
  } catch (error) {
    console.error("Error enviando SMS:", error);
  }
}

// === Ejecución de prueba ===

const datosDeEntrada = {
  customerId: "1234",
  customerName: "Juan Pérez",
  use: "G03 - Gastos en general",
  paymentForm: "03 - Transferencia electrónica",
  paymentMethod: "PUE",
  items: [
    { productId: "PROD-001", quantity: 2, unitPrice: 100, total: 200 },
    { productId: "PROD-002", quantity: 1, unitPrice: 150, total: 150 },
  ],
};

const factura = generateFakeInvoice(datosDeEntrada);

generateInvoiceSummary(factura, datosDeEntrada).then(async (resumen) => {
  console.log("\nResumen generado por IA:");
  console.log(resumen);

  // Aquí se envía el SMS con el resumen generado
  await sendSms(resumen);
});
