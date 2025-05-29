const { MongoClient } = require('mongodb');
const config = require('./config');

const uri = config.CONNECTION_STRING;
const client = new MongoClient(uri);

let db;

async function connectDB() {
    await client.connect();
    db = client.db(config.DATABASE); // elige el nombre de tu BD
    console.log(`Conectado a la base de datos ${config.DATABASE}`);
    return db;
}

module.exports = connectDB;
