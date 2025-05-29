const connectDB = require('../config/database.config');
const Facturapi = require('facturapi').default;
const facturapi = new Facturapi(process.env.API_KEY_FA);

async function getInvoices() {
    try {
        const facturas = await facturapi.invoices.list();
        if (facturas) {
            return console.log(facturas);
        }
        console.log("Sin facturas registradas")
    } catch (error) {
        console.error('Error al listar facturas:', error);
    }
}
getInvoices()
//682f690ee51f69ee6f9a8487

async function getCollection(collectionName) {
    const db = await connectDB();
    return db.collection(collectionName);
}