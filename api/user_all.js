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
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: "phone and password are required" });
    }

    const sqlMembser = "SELECT * FROM Membser WHERE phone = ? AND password = ?";
    const sqlRider = "SELECT * FROM Rider WHERE phone = ? AND password = ?";

    // Check in Membser table
    conn.query(sqlMembser, [phone, password], (err, result) => {
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
            conn.query(sqlRider, [phone, password], (err, result) => {
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
                    return res.status(401).json({ error: "Invalid phone or password" });
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

//สมัคสมาชิก memeber
router.post("/regismember",  (req,res)=> {
    const {name,lastname,phone,email,password,address,gps,image} = req.body;


     // ตรวจสอบไม่ให้มีการกรอกค่าว่างหรือกรอกแต่ช่องว่าง
  if (!name || !lastname || !phone || !email || !password || !address  || !image ||
    name.trim() === '' || lastname.trim() === '' || phone.trim() === '' ||
    email.trim() === '' || password.trim() === '') {
  return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนและไม่เป็นช่องว่าง' });
}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
  // ตรวจสอบว่าอีเมลหรือเบอร์โทรศัพท์มีอยู่แล้วในฐานข้อมูลหรือไม่
    const checkQuery =` SELECT phone FROM Membser WHERE email = ? OR phone = ?
     UNION
        SELECT phone FROM Rider WHERE phone = ?`;
    conn.query(checkQuery,[email,phone,phone],(err,result)=>{
        if (err) {
            console.error('Error checking existing user:', err);
            return res.status(500).json({ error: 'Error checking existing user' });
        }
           // ถ้าเจอผู้ใช้ที่มีอีเมลหรือเบอร์โทรซ้ำกัน
           if (result.length > 0) {
            return res.status(400).json({ error: 'มีผู้ใช้ที่ใช้ email หรือเบอร์โทรนี้แล้ว' });
          }

              // แยกค่า latitude และ longitude จากตัวแปร gps
        const [latitude, longitude] = gps.split(",").map(coord => coord.trim());
        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Invalid GPS format. It should be "latitude,longitude".' });
        }

        // ถ้าไม่มีผู้ใช้ซ้ำ ทำการสมัครสมาชิก
        const query = 'INSERT INTO Membser (name,lastname, phone,email, password,type,address,start_gps,image) VALUES (?, ?, ?, ?, ?,?,?,ST_GeomFromText(?),?)';
        const gpsPoint = `POINT(${latitude} ${longitude})`; // จัดรูปแบบ GPS ที่ถูกต้อง
        conn.query(query, [name, lastname,phone,email , password, 'member',address,gpsPoint,image], (err, result) => {
            if (err) {
                console.error('Error during registration:', err);
                return res.status(500).json({ error: 'Error during registration' });
            }

            return res.status(200).json({ success: true, user: result, message: 'Register successful' });
        });
    });
});


//สมัคสมาชิก rider
router.post("/regisrider", (req,res)=> {
    const {name,lastname,phone,cargis,email,password,image} = req.body;

    // ตรวจสอบไม่ให้มีการกรอกค่าว่างหรือกรอกแต่ช่องว่าง
 if (!name || !lastname || !phone || !cargis || !email || !password || !image ||
   name.trim() === '' || lastname.trim() === '' || phone.trim() === '' || cargis.trim() === '' ||
   email.trim() === '' || password.trim() === '' ) {
 return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนและไม่เป็นช่องว่าง' });
}

   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
       return res.status(400).json({ error: 'Invalid email format' });
   }
 // ตรวจสอบว่าอีเมลหรือเบอร์โทรศัพท์มีอยู่แล้วในฐานข้อมูลหรือไม่
   const checkQuery = `SELECT phone FROM Rider WHERE email = ? OR phone = ?
    UNION
        SELECT phone FROM Membser WHERE phone = ?`;
   conn.query(checkQuery,[email,phone,phone],(err,result)=>{
       if (err) {
           console.error('Error checking existing user:', err);
           return res.status(500).json({ error: 'Error checking existing user' });
       }
          // ถ้าเจอผู้ใช้ที่มีอีเมลหรือเบอร์โทรซ้ำกัน
          if (result.length > 0) {
           return res.status(400).json({ error: 'มีผู้ใช้ที่ใช้ email หรือเบอร์โทรนี้แล้ว' });
         }
       // ถ้าไม่มีผู้ใช้ซ้ำ ทำการสมัครสมาชิก
       const query = 'INSERT INTO Rider (name,lastname, phone,car_registration,email, password,type,image) VALUES (?, ?, ?, ?, ?,?,?,?)';
       conn.query(query, [name, lastname, phone,cargis,email, password, 'rider',image], (err, result) => {
           if (err) {
               console.error('Error during registration:', err);
               return res.status(500).json({ error: 'Error during registration' });
           }

           return res.status(200).json({ success: true, user: result, message: 'Register successful' });
       });
   });
});


///เส้นคนหาผู้รับจากเบอร์โทร *จะค้นหาไม่เห็นเบอร์ของตัวเอง 
router.get("/seachrec", (req, res) => {
    const phone = req.query.phone; // เบอร์โทรที่ต้องการค้นหา
    const myPhone = req.query.myPhone; // เบอร์โทรของผู้ค้นหาเอง

    if (!phone || !myPhone) {
        return res.status(400).json({ error: 'กรุณาระบุเบอร์โทรที่ต้องการค้นหาและเบอร์โทรของคุณเอง' });
    }

    let query;
    let params;

    // เช็คความยาวของเบอร์โทรที่กรอก
    if (phone.length < 10) {
        // ค้นหาข้อมูลสมาชิกที่มีเบอร์โทรที่เริ่มต้นด้วยเลขที่กรอก
        query = `
            SELECT * FROM Membser
            WHERE phone LIKE ? AND phone != ?
        `;
        params = [`${phone}%`, myPhone];
    } else {
        // แสดงข้อมูลเฉพาะผู้รับที่มีเบอร์ตรงกัน
        query = `
            SELECT * FROM Membser
            WHERE phone = ? AND phone != ?
        `;
        params = [phone, myPhone];
    }

    // ดึงข้อมูลจาก MySQL
    conn.query(query, params, (err, results) => {
        if (err) {
            console.error('Error occurred while searching member:', err);
            return res.status(500).json({ error: "Internal Server Error", details: err });
        }

        // ตรวจสอบความยาวของ results
        if (!results || results.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลผู้รับ' });
        }

        // ส่งผลลัพธ์การค้นหากลับไป
        res.json(results);
    });
});


//อัปเดต ที่อยู่ 
router.put("/updatememberlocation", (req, res) => {
    const { mid, address, gps } = req.body;

    // ตรวจสอบไม่ให้มีการกรอกค่าว่างหรือกรอกแต่ช่องว่าง
    if (!mid || !address || !gps || address.trim() === '') {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วนและไม่เป็นช่องว่าง' });
    }

    // แยกค่า latitude และ longitude จากตัวแปร gps
    const [latitude, longitude] = gps.split(",").map(coord => coord.trim());
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'รูปแบบพิกัด GPS ไม่ถูกต้อง ต้องเป็น "latitude,longitude"' });
    }

    // อัปเดตที่อยู่และพิกัด GPS ในฐานข้อมูล
    const query = 'UPDATE Membser SET address = ?, start_gps = ST_GeomFromText(?) WHERE mid = ?';
    const gpsPoint = `POINT(${latitude} ${longitude})`; // จัดรูปแบบ GPS ที่ถูกต้อง
    conn.query(query, [address, gpsPoint, mid], (err, result) => {
        if (err) {
            console.error('เกิดข้อผิดพลาดขณะอัปเดต:', err);
            return res.status(500).json({ error: 'เกิดข้อผิดพลาดขณะอัปเดต' });
        }

        // ตรวจสอบว่ามีการอัปเดตจริงหรือไม่
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'ไม่พบสมาชิกที่ต้องการอัปเดต' });
        }

        return res.status(200).json({ success: true, message: 'อัปเดตตำแหน่งเรียบร้อยแล้ว' });
    });
});



 


// ส่งออก router
module.exports = { router };