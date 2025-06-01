const connectDB = require("../config/database.config");
const Facturapi = require("facturapi").default;
const facturapi = new Facturapi(process.env.API_KEY_FA);
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");

// Importar la librería de Twilio
const twilio = require("twilio");

// Configurar cliente de Twilio (asegúrate de que estas variables de entorno estén definidas)
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_NUMBER;

async function getCollection(collectionName) {
  const db = await connectDB();
  return db.collection(collectionName);
}

async function createInvoice(input) {
  const customersCollection = await getCollection("customers");
  const invoicesCollection = await getCollection("invoices");

  const customer = await customersCollection.findOne({
    _id: new ObjectId(input.customerId),
  });
  if (!customer) throw new Error("Customer not found");

  const items = input.items.map((item) => ({
    quantity: item.quantity,
    product: item.productId,
  }));

  const invoice = await facturapi.invoices.create({
    customer: customer.facturapiId,
    items,
    use: input.use,
    payment_form: input.paymentForm,
    payment_method: input.paymentMethod,
  });

  const newInvoice = {
    facturapiId: invoice.id,
    customerId: input.customerId,
    items: input.items,
    total: invoice.total,
    createdAt: invoice.created_at,
  };

  const aiSummary = await generateInvoiceSummary(invoice, summaryInput);

  const result = await invoicesCollection.insertOne(newInvoice);

  if (input.customerPhoneNumber) {
    await sendSmsSummary(input.customerPhoneNumber, aiSummary);
  } else {
    console.warn(
      `No se envió SMS: customerPhoneNumber no proporcionado para el cliente ${input.customerId}.`
    );
  }

  return { id: result.insertedId, ...newInvoice };
}

async function listInvoices() {
  const invoicesCollection = await getCollection("invoices");
  const invoices = await invoicesCollection.find().toArray();
  return invoices.map((inv) => ({ id: inv._id, ...inv }));
}

async function getInvoice(id) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Invoice not found");
  return { id: invoice._id, ...invoice };
}

async function getInvoicesByCustomer(customerId) {
  const invoicesCollection = await getCollection("invoices");
  const invoices = await invoicesCollection.find({ customerId }).toArray();
  return invoices.map((inv) => ({ id: inv._id, ...inv }));
}

async function cancelInvoice(id) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Invoice not found");

  await facturapi.invoices.cancel(invoice.facturapiId);
  await invoicesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "canceled" } }
  );

  return true;
}

async function downloadInvoice(id, format) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Invoice not found");

  const validFormats = ["pdf", "xml", "zip"];
  if (!validFormats.includes(format)) throw new Error("Invalid format");

  const stream = await facturapi.invoices.download(invoice.facturapiId, format);
  const filePath = path.join(
    __dirname,
    `../downloads/${invoice.facturapiId}.${format}`
  );
  const writeStream = fs.createWriteStream(filePath);
  stream.pipe(writeStream);

  return filePath;
}

async function sendInvoiceByEmail(id, email) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Invoice not found");

  const payload = email ? { email } : undefined;
  await facturapi.invoices.sendByEmail(invoice.facturapiId, payload);

  return true;
}

async function generateInvoiceSummary(invoiceData, originalInput) {
  try {
    const prompt = `
Redacta un resumen Máximo 3 oraciones y menos de 50 palabras. En español. breve y fácil de entender sobre esta factura. Usa un lenguaje claro y directo.
Incluye: nombre del cliente, total a pagar con moneda, uso, forma de pago, método de pago, y lista de artículos.

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
            `- ${item.quantity}x ${item.productId} (Unitario: $${item.unitPrice}, Total: $${item.total})`
        )
        .join("\n")
    : "No hay artículos."
}
`;

    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { contents: chatHistory };
    const apiKey = process.env.GEMINI_API_KEY || "API_KEY_AQUI";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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

    if (
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      return result.candidates[0].content.parts[0].text;
    } else {
      console.warn("Estructura de respuesta inesperada de Gemini.");
      return "No se pudo generar un resumen de la factura.";
    }
  } catch (err) {
    console.error("Error al generar resumen:", err);
    return `Error al generar el resumen con IA: ${err.message}`;
  }
}

async function sendSmsSummary(toPhoneNumber, message) {
  if (!toPhoneNumber || !message) {
    console.warn(
      "Advertencia: No se puede enviar SMS. Número de teléfono o mensaje missing."
    );
    return;
  }
  if (!TWILIO_PHONE_NUMBER) {
    console.error(
      "Error: TWILIO_PHONE_NUMBER no está configurado en las variables de entorno."
    );
    return;
  }

  try {
    const smsResponse = await twilioClient.messages.create({
      body: `Resumen de tu factura: ${message}`,
      from: TWILIO_PHONE_NUMBER, // Tu número de Twilio
      to: toPhoneNumber, // Número de teléfono del cliente
    });
    console.log(
      `SMS enviado exitosamente a ${toPhoneNumber}. SID: ${smsResponse.sid}`
    );
  } catch (error) {
    console.error(`Error al enviar SMS a ${toPhoneNumber}:`, error);
    // Aquí podrías añadir una lógica para reintentar o registrar el error
  }
}

module.exports = {
  createInvoice,
  listInvoices,
  getInvoice,
  getInvoicesByCustomer,
  cancelInvoice,
  downloadInvoice,
  sendInvoiceByEmail,
};
