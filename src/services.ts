import { Slip } from "./models/Slip";
import { User } from "./models/User";
import { Trans,findTransDB,updateTransDB } from "./models/Transaction";
import { validate } from 'promptparse'
import Jimp from "jimp";
import jsQR from "jsqr";
import crypto from "crypto";
export const  checkNameMatch = (a, b) => {
  // ลบคำนำหน้า "นาย" ออกจาก a
  const cleanedA = a.replace(/นาย\s+/g, '').trim(); // ลบ "นาย" และช่องว่าง
  // ตรวจสอบว่า cleanedA เป็นส่วนหนึ่งของ b หรือไม่
  return b.includes(cleanedA);
}
export const checkAccBankDigitsMatch = (a, b) => {
  const cleanedA = a.replace(/-/g, '');
  const cleanedB = b.replace(/-/g, '');
  if (cleanedA.length !== cleanedB.length) return false;
  for (let i = 0; i < cleanedA.length; i++) {
      if (cleanedA[i] !== 'x' && cleanedA[i] !== cleanedB[i]) return false;
  }
  return true;
}
// สแกน QR Code จากภาพ
export const step_scanImageBuffer = async (imageBuffer: BufferSource) => {
  const img = await Jimp.read(imageBuffer as any);
  const code = jsQR(img.bitmap.data, img.bitmap.width, img.bitmap.height);
  if (code === null) return { status: false, message: "ไม่พบ QR Code" };
  return { status: true, code: code.data };
};


export const step_scanQRID = async (qrid:string) => {
  let ppqr = await validate.slipVerify(qrid)
  if(!ppqr) return { status: false,message:'ไม่พบข้อมูลใน QR Code นี้'}
  return { status: true, code: qrid }
}

export class connect_SlipOk {
    constructor() {
      this.url = process.env.slipok_url;
      this.headers ={
        'Content-Type': 'application/json',
        'x-authorization': process.env.slipok_authorization
      };
    }
    async quota() {
      try {
        const response = await fetch(`${this.url}/quota`, {
          method: "GET",
          headers: this.headers
        });
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Validation failed:", error);
        throw error;
      }
    }
    async validateSlip(qrcodeData) {
      try {
        const response = await fetch(this.url, {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({
            data: qrcodeData,
            log: false
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Validation failed:", error);
        throw error;
      }
    }
  }
  

  // ยิง API ดึงข้อมูลจาก QR Code
export const slip_api = async (api,qrid) => {
    let data = await validate.slipVerify(qrid)
    if(!data) return { success: false,message:'ไม่พบข้อมูลใน QR Code นี้'}
  if (api === "slipok") {
      const responseData = await new connect_SlipOk().validateSlip(qrid)
      return {...responseData.data,api_data:"slipok",success:true};
    }
  }


// สร้างฟังก์ชันสำหรับสร้าง API Key
export const generateApiKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

