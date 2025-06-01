// models/producto.js
const mongoose = require('mongoose');
require('./mongo'); // importa la conexión a MongoDB

const ProductoSchema = new mongoose.Schema({
  nombre:       { type: String, required: true },
  descripcion:  { type: String },
  precio:       { type: Number, required: true },
  stock:        { type: Number, default: 0 },
  facturapiId:  { type: String } // ID del producto en FacturAPI (si lo necesitas)
});

module.exports = mongoose.model('Producto', ProductoSchema);
