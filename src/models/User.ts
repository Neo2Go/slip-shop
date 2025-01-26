import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// กำหนดโครงสร้างข้อมูลสำหรับผู้ใช้
interface IUser extends Document {
  username: string;
  apiKey: string;
  credit: number;
}

// สร้าง Schema สำหรับผู้ใช้
const userSchema = new Schema<IUser>({
  username: { type: String, unique: true, required: true }, // ชื่อผู้ใช้ (ไม่ซ้ำกัน)
  apiKey: { type: String, unique: true, default: () => uuidv4() }, // API Key (สร้างอัตโนมัติ)
  credit: { type: Number, default: 0 }, // เครดิต (เริ่มต้นที่ 0)
});

// สร้างโมเดล User จาก Schema
export const User = model<IUser>('User', userSchema);

export const addCredit = async(user, amount) => {
    const roundedAmount = Math.round(amount * 100) / 100; // ปัดเศษ 2 ตำแหน่ง
    user.credit = Math.round((user.credit + roundedAmount) * 100) / 100; // ปัดเศษรวม
    await user.save();
    console.log(`เติมสำเร็จ: ${roundedAmount} ยอดรวม: ${user.credit}`);
    return { success: true, credit: user.credit };
  }
export const deductCredit = async(user, amount) => {
  user.credit = Math.round((user.credit - amount) * 100) / 100;
  await user.save();
}
export const findUserDB = async (qrcodeData: string) => {
  const result = await User.findOne({ qrcodeData }, { projection: { _id: 0 } });
  return result ? { ...result, payload: qrcodeData } : false;
};

export const updateUserDB = async (qrcodeData: string, data: Record<string, any>): Promise<void> => {
  try {
    await User.updateOne(
      { qrcodeData },
      { $set: { qrcodeData, data: data } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error in updateUser:", error);
  }
};
