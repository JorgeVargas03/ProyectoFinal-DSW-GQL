const connectDB = require("../config/database.config");
const Facturapi = require("facturapi").default;
const facturapi = new Facturapi(process.env.API_KEY_FA);
const { ObjectId } = require("mongodb");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const downloadsFolder = require("downloads-folder");
const os = require("os");

//AWS
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");



// Importar la librería de Twilio
const twilio = require("twilio");
const TWILIO_ACCOUNT_SID = process.env.TWILIO_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_TOKEN;
const apiKey = process.env.GEMINI_API_KEY;

console.log("GEMINI API KEY: ", apiKey);
// Configurar cliente de Twilio (asegúrate de que estas variables de entorno estén definidas)
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_SMS_NUMBER;

//Configurar entorno de AWS
const s3 = new S3Client({
  region: process.env.AWS_REGION, // Por ejemplo, 'us-east-1'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


async function getCollection(collectionName) {
  const db = await connectDB();
  return db.collection(collectionName);
}

async function createInvoice(input) {
  const customersCollection = await getCollection("clientes");
  const invoicesCollection = await getCollection("invoices");
  const productosCollection = await getCollection("productos");

  const customer = await customersCollection.findOne({
    _id: new ObjectId(input.customerId),
  });

  if (!customer) throw new Error("Customer not found");

  // Construir items enriquecidos para Facturapi y para guardar
  const facturapiItems = [];
  const enrichedItems = [];

  for (const item of input.items) {
    const producto = await productosCollection.findOne({
      _id: new ObjectId(item.productId),
    });

    if (!producto)
      throw new Error(`Producto con ID ${item.productId} no encontrado`);
    if (!producto.facturapiId)
      throw new Error(`Producto ${producto.nombre} no tiene facturapiId`);
    if (producto.precio == null)
      throw new Error(`Producto ${producto.nombre} no tiene precio definido`);

    facturapiItems.push({
      product: producto.facturapiId,
      quantity: item.quantity, // ✅ solo esto
    });

    enrichedItems.push({
      productId: item.productId,
      nombre: producto.nombre,
      precio: producto.precio,
      quantity: item.quantity,
      total: producto.precio * item.quantity,
      facturapiId: producto.facturapiId,
    });
  }

  // Crear factura en Facturapi
  const invoice = await facturapi.invoices.create({
    customer: customer.facturapiId,
    items: facturapiItems,
    use: input.use,
    payment_form: input.paymentForm,
    payment_method: input.paymentMethod,
    status: input.status || null
  });

  // Construir entrada para guardar en Mongo
  const newInvoice = {
    facturapiId: invoice.id,
    customerId: input.customerId,
    customerName: customer.nombre,
    items: enrichedItems,
    total: invoice.total,
    createdAt: invoice.created_at,
    status: producto.status || "valid"
  };

  // Generar resumen IA
  const summaryInput = {
    customerName: customer.nombre,
    customerId: input.customerId,
    use: input.use,
    paymentForm: input.paymentForm,
    paymentMethod: input.paymentMethod,
    items: enrichedItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.precio,
      total: item.total,
    })),
    status: producto.status || "valid"
  };

  const aiSummary = await generateInvoiceSummary(invoice, summaryInput);
  newInvoice.aiSummary = aiSummary; // 🔹 Agregar resumen al documento

  // Insertar en Mongo
  const result = await invoicesCollection.insertOne(newInvoice);

  // Enviar SMS si hay número
  if (input.customerPhoneNumber) {
    await sendSms(aiSummary);
  } else {
    console.warn(
      `No se envió SMS: customerPhoneNumber no proporcionado para el cliente ${input.customerId}.`
    );
  }

  return { id: result.insertedId, ...newInvoice };
}

async function updateInvoice(id, input) {
  const invoicesCollection = await getCollection("invoices");
  const productosCollection = await getCollection("productos");
  const customersCollection = await getCollection("clientes");

  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Factura no encontrada");

  if (invoice.status !== "draft") {
    throw new Error("Solo se pueden editar facturas en estado 'draft'");
  }

  // Obtener información del cliente
  const customer = await customersCollection.findOne({ _id: new ObjectId(invoice.customerId) });
  if (!customer) throw new Error("Cliente no encontrado");

  // Construir items enriquecidos
  const facturapiItems = [];
  const enrichedItems = [];

  for (const item of input.items) {
    const producto = await productosCollection.findOne({ _id: new ObjectId(item.productId) });
    if (!producto) throw new Error(`Producto con ID ${item.productId} no encontrado`);

    facturapiItems.push({
      product: producto.facturapiId,
      quantity: item.quantity,
    });

    enrichedItems.push({
      productId: item.productId,
      nombre: producto.nombre,
      precio: producto.precio,
      quantity: item.quantity,
      total: producto.precio * item.quantity,
      facturapiId: producto.facturapiId,
    });
  }

  // Actualizar la factura en Facturapi
  await facturapi.invoices.updateDraft(invoice.facturapiId, {
    customer: customer.facturapiId,
    items: facturapiItems,
    use: input.use,
    payment_form: input.paymentForm,
    payment_method: input.paymentMethod,
  });

  // Actualizar la factura en la base de datos local
  await invoicesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        items: enrichedItems,
        use: input.use,
        paymentForm: input.paymentForm,
        paymentMethod: input.paymentMethod,
        updatedAt: new Date(),
      },
    }
  );

  return { id: invoice._id, ...invoice };
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

async function cancelInvoice(id, motivo = "01") {
  try {
    const invoicesCollection = await getCollection("invoices");
    const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
    if (!invoice) throw new Error("Invoice not found");

    // Cancelar factura con motivo
    await facturapi.invoices.cancel(invoice.facturapiId, {
      motive: motivo, // <-- Aquí se pasa el motivo como string
      // substitution: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // solo si aplica
    });

    await invoicesCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: "canceled",
          canceledAt: new Date(),
          cancelReason: motivo,
        },
      }
    );
  } catch (err) {
    return err.message;
  }

  return `Factura con el id: ${id} cancelada exitosamente`;
}


function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "_");
}

async function downloadInvoice(id, format) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Invoice not found");

  const validFormats = ["pdf", "xml", "zip"];
  if (!validFormats.includes(format)) throw new Error("Invalid format");

  const url = `https://www.facturapi.io/v2/invoices/${invoice.facturapiId}/${format}`;

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.API_KEY_FA}`,
    },
  });

  const name = invoice.customerName || "cliente";
  const date = new Date(invoice.date || Date.now()).toISOString().split("T")[0];
  const safeFileName = `factura_${sanitizeFileName(name)}_${date}.${format}`;

  const s3Client = new S3Client({ region: process.env.AWS_REGION });

  // Subir a S3
  const uploadParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: safeFileName,
    Body: Buffer.from(response.data),
    ContentType: getContentType(format),
    ContentDisposition: `attachment; filename="${safeFileName}"`,
  };


  await s3Client.send(new PutObjectCommand(uploadParams));

  // Obtener URL firmada (válida por 1 hora)
  const getObjectParams = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: safeFileName,
  };

  const signedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand(getObjectParams),
    { expiresIn: 3600 } // segundos (1 hora)
  );

  return signedUrl;
}


function getContentType(format) {
  switch (format) {
    case "pdf":
      return "application/pdf";
    case "xml":
      return "application/xml";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}


async function sendInvoiceByEmail(id, email) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Invoice not found");

  const payload = email ? { email } : undefined;
  await facturapi.invoices.sendByEmail(invoice.facturapiId, payload);

  return `Factura enviada correctamente al correo: ${email}`;
}

async function updateInvoiceStatus(id) {
  const invoicesCollection = await getCollection("invoices");
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error("Factura no encontrada");

  // Actualizar el estado de la factura en Facturapi
  const updatedInvoice = await facturapi.invoices.updateStatus(invoice.facturapiId);

  // Actualizar la factura en tu base de datos local
  await invoicesCollection.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: updatedInvoice.status,
        updatedAt: new Date(),
      },
    }
  );
  return { id: invoice._id, ...invoice };

}


async function generateInvoiceSummary(invoiceData, originalInput) {
  try {
    const prompt = `
Redacta un resumen Máximo 3 oraciones y menos de 30 palabras. En español. breve y fácil de entender sobre esta factura. Usa un lenguaje claro y directo.
Incluye: nombre del cliente, el totla pagado con moneda, uso, forma de pago, método de pago, y lista de artículos.

Cliente: ${originalInput.customerName || "No especificado"} (ID: ${originalInput.customerId
      })
Total: ${invoiceData.total || "No especificado"} ${invoiceData.currency || ""}
Uso: ${originalInput.use || "No especificado"}
Forma de pago: ${originalInput.paymentForm || "No especificado"}
Método de pago: ${originalInput.paymentMethod || "No especificado"}
Artículos:
${originalInput.items && originalInput.items.length > 0
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Falta la variable de entorno GEMINI_API_KEY");
    }
    const apiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Usamos axios en lugar de fetch
    const response = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    const result = response.data;
    const candidate =
      result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
        ? result.candidates[0].content.parts[0].text
        : null;

    if (candidate) {
      return candidate;
    } else {
      console.warn("Estructura de respuesta inesperada de Gemini:", result);
      return "No se pudo generar un resumen de la factura.";
    }
  } catch (err) {
    console.error("Error al generar resumen:", err);
    return `Error al generar el resumen con IA: ${err.message}`;
  }
}

const twilioClientSMS = twilio(
  process.env.TWILIO_SID_JORGE,
  process.env.TWILIO_TOKEN_JORGE
);

async function sendSms(message) {
  try {
    const messageResponse = await twilioClientSMS.messages.create({
      body: message,
      from: process.env.TWILIO_NUMBER,
      to: "+5213891089322",
    });
    console.log(`SMS enviado con SID: ${messageResponse.sid}`);
  } catch (error) {
    console.error("Error enviando SMS:", error);
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
  updateInvoiceStatus
};
