const express = require('express');
const { conn,queryAsync } = require('../dbcon');
const mysql = require('mysql');
const jwt = require('jsonwebtoken'); 

const router = express.Router();


///ระบบ การทำงาน ///
///sttus 1 = รอไรเดอรับงาน 
///sttus 2 = รอไรเดอรับสินค้า 
///sttus 3 = ไรเดอกำลังจัดส่ง 
///sttus 4 = จัดส่งเสร็จสิ้น


router.get("/order",(req,res)=>{

    const sql = "select * from Listorder";
    conn.query(sql,(err,result)=>{
        if(err){
            res.json(err);
        }else{
            res.json(result);
        }
    });

});

//เพิ่มรายการงาน
router.post("/addorder", async (req, res) => {
    const { mid_send, mid_rece, image_pd, detail } = req.body;
    try {
        // ไม่ต้องตรวจสอบ list_id เนื่องจาก list_id เป็น AUTO_INCREMENT

        // 1. สร้างคำสั่ง SQL สำหรับการ INSERT ข้อมูลลงใน Listorder โดยไม่ต้องระบุ list_id
        const sql = `
            INSERT INTO Listorder (image_pd, detail, status, mid_sender_fk, mid_rece_fk, rid_fk)
            VALUES (?, ?, 1, ?, ?, NULL)
        `;

        // 2. รันคำสั่ง SQL เพื่อเพิ่มข้อมูลลงในตาราง Listorder
        const result = await queryAsync(sql, [image_pd, detail, mid_send, mid_rece]);

        // 3. ส่ง response กลับไปยัง client พร้อมกับ ID ที่รันอัตโนมัติจาก MySQL
        res.status(200).json({
            message: 'Order added successfully',
            list_id: result.insertId, // ID ที่ MySQL รันอัตโนมัติ
            status: 1, // สถานะเริ่มต้น
        });
    } catch (error) {
        // หากเกิดข้อผิดพลาด ส่ง error กลับไป
        res.status(500).json({ message: 'Error adding order', error: error.message });
    }
});

///การจอยข้อมูลแสดงรายละเอียด ออร์เดอ์ กับ member 
router.get("/getdetail", async (req, res) => {
    try {
        // คำสั่ง SQL สำหรับการ JOIN ตาราง Listorder และ Members
        const sql = `
            SELECT 
                L.list_id,
                L.image_pd,
                L.detail,
                L.status,
                S.mid AS sender_id,
                S.name AS sender_name,
                S.lastname AS sender_lastname,
                S.email AS sender_email,
                S.phone AS sender_phone,
                S.image AS sender_image,
                S.address AS sender_address,
                S.start_gps AS sender_start_gps,
                R.mid AS receiver_id,
                R.name AS receiver_name,
                R.lastname AS receiver_lastname,
                R.email AS receiver_email,
                R.phone AS receiver_phone,
                R.image AS receiver_image,
                R.address AS receiver_address,
                R.start_gps AS receiver_start_gps
            FROM 
                Listorder L
            JOIN 
                Membser S ON L.mid_sender_fk = S.Mid
            JOIN 
                Membser R ON L.mid_rece_fk = R.Mid
            ORDER BY 
                L.list_id
        `;

        // รันคำสั่ง SQL และรับข้อมูลที่ได้จากการ JOIN
        const result = await queryAsync(sql);

        // ส่งข้อมูลกลับไปยัง client
        res.status(200).json({
            message: 'Order details fetched successfully',
            data: result
        });
    } catch (error) {
        // หากเกิดข้อผิดพลาด ส่ง error กลับไป
        res.status(500).json({
            message: 'Error fetching order details',
            error: error.message
        });
    }
});



// ส่งออก router
module.exports = { router };