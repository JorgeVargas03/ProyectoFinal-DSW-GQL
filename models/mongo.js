require('dotenv').config(); 

const mongoose = require('mongoose');

const URI = String(process.env.CONNECTION_STRING) + String(process.env.DATABASE);

mongoose.connect(URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB Atlas'))
.catch(err => console.error('Error al conectar a MongoDB:', err));