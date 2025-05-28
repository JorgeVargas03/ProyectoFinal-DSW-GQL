const { db } = require('../config/database.config');
const invoices = db.collection('invoices');

async function insertarFactura() {


    const nuevaFactura = {
        cliente: 'Juan Pérez',
        total: 1500,
        fecha: new Date(),
        productos: [
            { nombre: 'Producto A', precio: 500 },
            { nombre: 'Producto B', precio: 1000 }
        ]
    };

    try {
        const resultado = await invoices.insertOne(nuevaFactura);
        console.log('🧾 Factura insertada con _id:', resultado.insertedId);
    } catch (error) {
        console.error('❌ Error al insertar factura:', error);
    }
}

insertarFactura();
