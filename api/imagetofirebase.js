const express = require("express");
const multer = require("multer");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytesResumable, getDownloadURL } = require("firebase/storage");

const router = express.Router();

const firebaseConfig = {
    apiKey: "AIzaSyCVNPzwBX_dVp6buBJETGucUFpPlTIEGrk",
    authDomain: "godash-ap-mini2.firebaseapp.com",
    projectId: "godash-ap-mini2",
    storageBucket: "godash-ap-mini2.appspot.com",
    messagingSenderId: "1067832302492",
    appId: "1:1067832302492:web:08226c5e6e80e77e1e4659",
    measurementId: "G-QZQ451DDYE"
  };
  
  initializeApp(firebaseConfig);
  const storage = getStorage();

  ///filebase
// 2. ตั้งค่า multer สำหรับอัปโหลดไฟล์
const upload = multer({
    storage: multer.memoryStorage(), // เก็บไฟล์ไว้ในหน่วยความจำ (buffer)
    limits: { fileSize: 5 * 1024 * 1024 } // จำกัดขนาดไฟล์ที่ 5MB
});

// 3. สร้าง API สำหรับอัปโหลดไฟล์
router.post("/uploadimg", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        const filename = Date.now() + "-" + req.file.originalname;
        const storageRef = ref(storage, `uploads/${filename}`); // ตั้งชื่อไฟล์และที่อยู่ใน Firebase Storage

        // อัปโหลดไฟล์ไปยัง Firebase Storage
        const uploadTask = uploadBytesResumable(storageRef, req.file.buffer, {
            contentType: req.file.mimetype
        });

        // ตรวจสอบสถานะการอัปโหลดและส่งกลับ URL ของไฟล์
        uploadTask.on("state_changed", null, (error) => {
            console.error("Upload failed:", error);
            res.status(500).send("Upload failed.");
        }, async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            res.status(200).json({
                message: "File uploaded successfully!",
                url: downloadURL
            });
        });

    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).send("Internal Server Error.");
    }
});



// ส่งออก router
module.exports = { router };