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
                L.rid_fk,
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
                R.start_gps AS receiver_start_gps,
                T.name AS rider_name,
                T.lastname AS rider_lastname,
                T.email AS rider_email,
                T.phone AS rider_phone,
                T.image AS rider_image,
                T.car_registration AS rider_registration
            FROM 
                Listorder L
            JOIN 
                Membser S ON L.mid_sender_fk = S.Mid
            JOIN 
                Membser R ON L.mid_rece_fk = R.Mid
            JOIN 
                Rider T ON Rid = L.rid_fk
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

//Update listid
router.put("/uplistid", async (req,res) => {
    const { list_id , status} = req.body;
// ตรวจสอบว่าค่า status เป็นค่าที่อนุญาต
const allowedStatuses = ["1", "2", "3", "4"];
if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "ค่า status ไม่ถูกต้อง ค่าอนุญาตคือ '1', '2', '3', '4'." });
}
  // ตรวจสอบว่ามีการส่ง list_id มาหรือไม่
  if (!list_id) {
    return res.status(400).json({ message: "จำเป็นต้องระบุ list_id." });
}

try {
    // อัปเดตค่า list_id และ status ในฐานข้อมูล
    const query = `UPDATE Listorder SET status = ? WHERE list_id = ?`;
    const values = [status, list_id];

    // ดำเนินการคำสั่ง SQL
    conn.query(query, values, (err, result) => {
        if (err) {
            console.error("เกิดข้อผิดพลาดในการอัปเดตฐานข้อมูล: ", err);
            return res.status(500).json({ message: "ข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล." });
        }

        // ตรวจสอบว่ามีการอัปเดตข้อมูลใน list_id หรือไม่
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `ไม่พบรายการที่มี list_id: ${list_id}.` });
        }

        res.status(200).json({ message: `ออร์เดอร์ที่มี list_id ${list_id} ถูกอัปเดตเป็นสถานะ ${status}.` });
    });
} catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดต list_id: ", error);
    res.status(500).json({ message: "ข้อผิดพลาดในเซิร์ฟเวอร์." });
}
});


//update Rider ใน listorder
router.put("/uprider", async (req,res) => {
    const {list_id , rid} = req.body;
      // ตรวจสอบว่ามีการส่ง list_id มาหรือไม่
    
  if (!list_id) {
    return res.status(400).json({ message: "จำเป็นต้องระบุ list_id." });
}

  if (!rid) {
    return res.status(400).json({ message: "จำเป็นต้องระบุ rid." });
}
try {
    // อัปเดตค่า list_id และ status ในฐานข้อมูล
    const query = `UPDATE Listorder SET rid_fk = ? WHERE list_id = ?`;
    const values = [rid, list_id];

    // ดำเนินการคำสั่ง SQL
    conn.query(query, values, (err, result) => {
        if (err) {
            console.error("เกิดข้อผิดพลาดในการอัปเดตฐานข้อมูล: ", err);
            return res.status(500).json({ message: "ข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล." });
        }

        // ตรวจสอบว่ามีการอัปเดตข้อมูลใน list_id หรือไม่
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: `ไม่พบรายการที่มี list_id: ${list_id}.` });
        }

        res.status(200).json({ message: `ออร์เดอร์ที่มี list_id ${list_id} ถูกอัปเดตคนขับ ${rid}.` });
    });
} catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปเดต list_id: ", error);
    res.status(500).json({ message: "ข้อผิดพลาดในเซิร์ฟเวอร์." });
}

});



// ส่งออก router
module.exports = { router };