import { Schema, model, Document, Types } from 'mongoose';

// กำหนดโครงสร้างข้อมูลสำหรับสลิป
interface ITrans extends Document {
  qrcodeData: string; // ข้อมูล QR String
  data: Record<string, any>; // ข้อมูลเพิ่มเติม (Object)
  timestamp: Date; // เวลาที่บันทึกสลิป
}

// สร้าง Schema สำหรับสลิป
const TransSchema = new Schema<ITrans>({
  qrcodeData: { type: String, required: true }, // ข้อมูล QR String
  data: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }, // เวลาที่บันทึกสลิป (สร้างอัตโนมัติ)
});

// สร้างโมเดล Trans จาก Schema
export const Trans = model<ITrans>('Transaction', TransSchema);


export const findTransDB = async (qrcodeData: string) => {
  const result = await Trans.findOne({ qrcodeData }, { _id: 0 }).lean();
  return result ? { ...result} : false;
};

export const updateTransDB = async (qrcodeData: string, data: Record<string, any>): Promise<void> => {
  try {
    await Trans.updateOne(
      { qrcodeData },
      { $set: { qrcodeData, data: data } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error in updatetrans:", error);
  }
};
