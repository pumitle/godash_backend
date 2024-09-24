const express = require('express');
const { conn,queryAsync } = require('../dbcon');
const mysql = require('mysql');
const jwt = require('jsonwebtoken'); 

const router = express.Router();

router.get("/",(req,res)=>{

    const sql = "select * from Membser";
    conn.query(sql,(err,result)=>{
        if(err){
            res.json(err);
        }else{
            res.json(result);
        }
    });

});

router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "email and password are required" });
    }

    const sqlMembser = "SELECT * FROM Membser WHERE email = ? AND password = ?";
    const sqlRider = "SELECT * FROM Rider WHERE email = ? AND password = ?";

    // Check in Membser table
    conn.query(sqlMembser, [email, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Internal Server Error" });
        }

        if (result.length > 0) {
            const user = result[0];
            const userRes = {
                Mid: user.Mid,
                name: user.name,
                lastname: user.lastname,
                email: user.email,
                password: user.password,
                phone: user.phone,
                image: user.image,
                address: user.address,
                start_gps: user.start_gps,
                type: user.type, // Type of user

            };

            return res.json({ message: "Login successful", user: userRes });
        } else {
            // If not found in Membser, check in Rider table
            conn.query(sqlRider, [email, password], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                if (result.length > 0) {
                    const user = result[0];
                    const userRes = {
                        Rid: user.Rid,
                        name: user.name,
                        lastname: user.lastname,
                        email: user.email,
                        password: user.password,
                        phone: user.phone,
                        image: user.image,
                        car_registration: user.car_registration,
                        type: user.type, // Type of user
                        
                    };

                    return res.json({ message: "Login successful", user: userRes });
                } else {
                    return res.status(401).json({ error: "Invalid email or password" });
                }
            });
        }
    });
});

//เส้นดึงข้อมูลตามId 
router.get("/getUser", async (req, res) => {
    const userId = req.query.id; // ดึง userId จาก query parameters
    const userType = req.query.type; // ดึง userType จาก query parameters

    try {
        let sql;
        let params;

        if (userType === 'member') {
            // สร้างคำสั่ง SQL สำหรับ Member
            sql = 'SELECT * FROM Membser WHERE Mid = ?'; // เปลี่ยน id เป็นชื่อคอลัมน์ที่ใช้ในตาราง Member
            params = [userId];
        } else if (userType === 'rider') {
            // สร้างคำสั่ง SQL สำหรับ Rider
            sql = 'SELECT * FROM Rider WHERE Rid = ?'; // เปลี่ยน id เป็นชื่อคอลัมน์ที่ใช้ในตาราง Rider
            params = [userId];
        } else {
            return res.status(400).json({ message: 'Invalid user type' });
        }

        // รันคำสั่ง SQL
        const result = await queryAsync(sql, params);

        if (result.length > 0) {
            res.status(200).json({
                message: 'User fetched successfully',
                data: result[0] // ส่งข้อมูลผู้ใช้คนแรกกลับ
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        // หากเกิดข้อผิดพลาด ส่ง error กลับไป
        res.status(500).json({
            message: 'Error fetching user data',
            error: error.message
        });
    }
});


 


// ส่งออก router
module.exports = { router };