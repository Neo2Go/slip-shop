import { Schema, model, Document, Types } from 'mongoose';

// กำหนดโครงสร้างข้อมูลสำหรับสลิป
interface ISlip extends Document {
  userId: Types.ObjectId; // ไอดีผู้ใช้ที่เกี่ยวข้อง
  qrcodeData: string; // ข้อมูล QR String
  timestamp: Date; // เวลาที่บันทึกสลิป
}

// สร้าง Schema สำหรับสลิป
const slipSchema = new Schema<ISlip>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // อ้างอิงถึงผู้ใช้
  qrcodeData: { type: String, required: true }, // ข้อมูล QR String
  timestamp: { type: Date, default: Date.now }, // เวลาที่บันทึกสลิป (สร้างอัตโนมัติ)
});

// สร้างโมเดล Slip จาก Schema
export const Slip = model<ISlip>('Slip', slipSchema);


export const findSlipDB = async (userId: string, qrcodeData: string) => {
  const result = await Slip.findOne({ userId, qrcodeData }, { projection: { _id: 0 } });
    return result ? { ...result, payload: qrcodeData } : false;
};

export const updateSlipDB = async (userId: string, qrcodeData: string): Promise<void> => {
  try {
    await Slip.updateOne(
      { userId, qrcodeData },
      { $set: { userId, qrcodeData } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error in updateSlip:", error);
  }
};