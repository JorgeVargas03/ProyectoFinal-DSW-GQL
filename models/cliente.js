const mongoose = require('mongoose');
require('./mongo');

const ClienteSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  rfc: String,
  telefono: String,
  direccion: String,
  facturapiId: String
});

module.exports = mongoose.model('Cliente', ClienteSchema);