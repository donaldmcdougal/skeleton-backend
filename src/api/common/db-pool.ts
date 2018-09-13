import mysql = require('promise-mysql');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: parseInt(process.env.DB_POOL_CONNECTION_LIMIT)
});

export class Database {

    static getSqlConnection() {
        return pool.getConnection().disposer((connection) => {
            pool.releaseConnection(connection);
        });
    }
}
