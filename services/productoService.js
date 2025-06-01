// services/productoService.js
const Producto = require('../models/producto');
const facturapi = require('./facturapi');
const twilio = require('twilio');

const TWILIO_ACCOUNT_SID       = process.env.TWILIO_SID;
const TWILIO_AUTH_TOKEN        = process.env.TWILIO_TOKEN;
const TWILIO_WHATSAPP_NUMBER   = process.env.TWILIO_WHATSAPP_NUMBER; // ej. 'whatsapp:+1415XXXXXXX'
const CLIENTE_WHATSAPP_NUMBER  = process.env.CLIENTE_WHATSAPP_NUMBER; // número receptor

// Inicializa el cliente de Twilio
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function enviarWhatsApp(mensaje) {
  if (!TWILIO_WHATSAPP_NUMBER || !CLIENTE_WHATSAPP_NUMBER) {
    console.warn('No están configurados correctamente los números de WhatsApp.');
    return;
  }

  try {
    const respuesta = await twilioClient.messages.create({
      body: mensaje,
      from: TWILIO_WHATSAPP_NUMBER,
      to: CLIENTE_WHATSAPP_NUMBER
    });
    console.log(`WhatsApp enviado (SID: ${respuesta.sid})`);
  } catch (err) {
    console.error('Error enviando WhatsApp:', err);
  }
}

// CREATE
async function crearProducto(input) {
  // 1) Crear en FacturAPI (opcional)
  let facturapiData = null;
  try {
    facturapiData = await facturapi.crearProducto(input);
  } catch (err) {
    console.warn('Warning: No se pudo crear producto en FacturAPI:', err.message);
  }

  // 2) Crear en MongoDB
  const nuevo = new Producto({
    nombre:       input.nombre,
    descripcion:  input.descripcion,
    precio:       input.precio,
    stock:        input.stock,
    facturapiId:  facturapiData?.id || null
  });
  const guardado = await nuevo.save();

  // 3) Enviar notificación vía WhatsApp
  const msg = `✅ Se ha creado un nuevo producto:\n` +
              `• Nombre: ${guardado.nombre}\n` +
              `• Precio: $${guardado.precio}\n` +
              `• Stock: ${guardado.stock}`;
  await enviarWhatsApp(msg);

  return guardado;
}

// READ (listar todos)
async function listarProductos() {
  return await Producto.find();
}

// READ (por id)
async function obtenerProducto(id) {
  const p = await Producto.findById(id);
  if (!p) throw new Error('Producto no encontrado');
  return p;
}

// UPDATE
async function actualizarProductoService(id, cambios) {
  const prod = await Producto.findById(id);
  if (!prod) throw new Error('Producto no encontrado');

  // 1) Actualizar en FacturAPI (si existe facturapiId)
  if (prod.facturapiId) {
    try {
      await facturapi.actualizarProducto(prod.facturapiId, cambios);
    } catch (err) {
      console.warn('Warning: No se pudo actualizar producto en FacturAPI:', err.message);
    }
  }

  // 2) Actualizar en MongoDB
  Object.assign(prod, cambios);
  const actualizado = await prod.save();

  // 3) Enviar notificación WhatsApp
  const msg = `✏️ Se ha actualizado el producto (ID: ${actualizado._id}):\n` +
              `• Nombre: ${actualizado.nombre}\n` +
              `• Precio: $${actualizado.precio}\n` +
              `• Stock: ${actualizado.stock}`;
  await enviarWhatsApp(msg);

  return actualizado;
}

// DELETE
async function eliminarProductoService(id) {
  const prod = await Producto.findById(id);
  if (!prod) throw new Error('Producto no encontrado');

  // 1) Eliminar en FacturAPI (si existe)
  if (prod.facturapiId) {
    try {
      await facturapi.eliminarProducto(prod.facturapiId);
    } catch (err) {
      console.warn('Warning: No se pudo eliminar producto en FacturAPI:', err.message);
    }
  }

  // 2) Borrar de MongoDB
  await prod.deleteOne();

  // 3) Enviar notificación WhatsApp
  const msg = `🗑️ Se ha eliminado el producto:\n` +
              `• Nombre: ${prod.nombre}\n` +
              `• ID: ${prod._id}`;
  await enviarWhatsApp(msg);

  return true;
}

module.exports = {
  crearProducto,
  listarProductos,
  obtenerProducto,
  actualizarProductoService,
  eliminarProductoService
};
