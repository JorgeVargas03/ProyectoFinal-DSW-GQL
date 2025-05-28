require('dotenv').config();

module.exports = {
    CONNECTION_STRING: process.env.CONNECTION_STRING,
    DATABASE: process.env.DATABASE,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
};
