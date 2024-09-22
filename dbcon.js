// นำเข้าโมดูลที่ต้องการ
const mysql = require('mysql');
const util = require('util');

// สร้าง connection pool
const conn = mysql.createPool({
    connectionLimit: 10,
    host: "202.28.34.197",
    user: "web66_65011212026",
    password: "65011212026@csmsu",
    database: "web66_65011212026"
});

// แปลง query เป็นแบบ asynchronous โดยใช้ promisify
const queryAsync = util.promisify(conn.query).bind(conn);

// ส่งออกตัวแปรที่ใช้ภายนอก
module.exports = { conn, queryAsync };
