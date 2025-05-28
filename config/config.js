import dotenv from 'dotenv';

dotenv.config();

export default {
    CONNECTION_STRING: process.env.CONNECTION_STRING,
    DATABASE: process.env.DATABASE,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_USER: process.env.DB_USER,
}