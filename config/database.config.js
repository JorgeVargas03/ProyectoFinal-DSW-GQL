const { MongoClient } = require('mongodb');
const config = require('./config');

class MongoDB {
    constructor(uri) {
        this.client = new MongoClient(uri);
        this.db = null;
        this.connected = false;
    }

    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db();
            this.connected = true;
            console.log('✅ MongoDB conectado');
            return this;
        } catch (err) {
            console.error('❌ Error de conexión:', err);
            throw err;
        }
    }

    collection(name) {
        if (!this.connected) {
            throw new Error('Debes llamar a connect() primero');
        }
        return this.db.collection(name);
    }
}

// Creamos y conectamos inmediatamente
const instance = new MongoDB(config.CONNECTION_STRING).connect();

module.exports = {
    db: instance
};