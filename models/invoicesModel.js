const connectDB = require('../config/database.config');
const Facturapi = require('facturapi').default;
const facturapi = new Facturapi(process.env.API_KEY_FA);
const { ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function getCollection(collectionName) {
  const db = await connectDB();
  return db.collection(collectionName);
}

async function createInvoice(input) {
  const customersCollection = await getCollection('customers');
  const invoicesCollection = await getCollection('invoices');

  const customer = await customersCollection.findOne({ _id: new ObjectId(input.customerId) });
  if (!customer) throw new Error('Customer not found');

  const items = input.items.map(item => ({
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

  const result = await invoicesCollection.insertOne(newInvoice);
  return { id: result.insertedId, ...newInvoice };
}

async function listInvoices() {
  const invoicesCollection = await getCollection('invoices');
  const invoices = await invoicesCollection.find().toArray();
  return invoices.map(inv => ({ id: inv._id, ...inv }));
}

async function getInvoice(id) {
  const invoicesCollection = await getCollection('invoices');
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error('Invoice not found');
  return { id: invoice._id, ...invoice };
}

async function getInvoicesByCustomer(customerId) {
  const invoicesCollection = await getCollection('invoices');
  const invoices = await invoicesCollection.find({ customerId }).toArray();
  return invoices.map(inv => ({ id: inv._id, ...inv }));
}

async function cancelInvoice(id) {
  const invoicesCollection = await getCollection('invoices');
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error('Invoice not found');

  await facturapi.invoices.cancel(invoice.facturapiId);
  await invoicesCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'canceled' } }
  );

  return true;
}

async function downloadInvoice(id, format) {
  const invoicesCollection = await getCollection('invoices');
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error('Invoice not found');

  const validFormats = ['pdf', 'xml', 'zip'];
  if (!validFormats.includes(format)) throw new Error('Invalid format');

  const stream = await facturapi.invoices.download(invoice.facturapiId, format);
  const filePath = path.join(__dirname, `../downloads/${invoice.facturapiId}.${format}`);
  const writeStream = fs.createWriteStream(filePath);
  stream.pipe(writeStream);

  return filePath;
}

async function sendInvoiceByEmail(id, email) {
  const invoicesCollection = await getCollection('invoices');
  const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });
  if (!invoice) throw new Error('Invoice not found');

  const payload = email ? { email } : undefined;
  await facturapi.invoices.sendByEmail(invoice.facturapiId, payload);

  return true;
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
