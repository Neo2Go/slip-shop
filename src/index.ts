import { Elysia } from 'elysia';
import mongoose from 'mongoose';
import { User ,addCredit ,deductCredit } from './models/User';
import { findSlipDB, Slip } from './models/Slip';
import { Trans ,findTransDB , updateTransDB} from './models/Transaction';
import { step_scanQRID , slip_api ,checkAccBankDigitsMatch,checkNameMatch } from './services';
import { v4 as uuidv4 } from 'uuid';
const env_AccuntName = process.env.ACCOUNT_Name;
const env_AccuntValue=process.env.ACCOUNT_Value
const env_Mae_Manee = process.env.Mae_Manee;
// สร้างฟังก์ชันเชื่อมต่อฐานข้อมูล
export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URL;
    await mongoose.connect(uri);
    const timenow = new Date().toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Bangkok",
    });
    console.log(timenow);
    console.log("🦊 Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1); // ออกจากโปรแกรมหากเชื่อมต่อไม่ได้
  }
};

const startApp = async () => {
  await connectDB(); // เชื่อมต่อฐานข้อมูล
  app.listen(7000, () => {
    console.log(
      `🦊 Elysia is running easySlip at ${app.server?.hostname}:${app.server?.port}`
    )}
  );
};


// สร้าง Elysia app
const app = new Elysia();

// API สำหรับสร้างผู้ใช้และสร้าง API Key
app.post('/api/register', async ({ body }) => {
  const { username } = body as { username: string };

  if (!username) {
    return { success: false, message: 'username is required' };
  }

  try {
    // สร้างผู้ใช้ใหม่
    const user = new User({ username });
    await user.save();

    return { success: true, message: 'User registered successfully', apiKey: user.apiKey };
  } catch (error) {
    return { success: false, message: 'Username already exists' };
  }
});

// API สำหรับเปลี่ยน API Key
app.post('/api/change-api-key', async ({ body }) => {
  const { username, oldApiKey } = body as { username: string; oldApiKey: string };

  if (!username || !oldApiKey) {
    return { success: false, message: 'username and oldApiKey are required' };
  }

  try {
    // ค้นหาผู้ใช้และตรวจสอบ API Key เดิม
    const user = await User.findOne({ username, apiKey: oldApiKey });
    if (!user) {
      return { success: false, message: 'Invalid username or API Key' };
    }

    // สร้าง API Key ใหม่
    user.apiKey = uuidv4();
    await user.save();

    return { success: true, message: 'API Key changed successfully', newApiKey: user.apiKey };
  } catch (error) {
    return { success: false, message: 'Failed to change API Key' };
  }
});

// Middleware สำหรับตรวจสอบ API Key
app.on('beforeHandle', async ({ request, set }) => {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    set.status = 401;
    return { success: false, message: 'API Key is required' };
  }

  const user = await User.findOne({ apiKey });
  if (!user) {
    set.status = 401;
    return { success: false, message: 'Invalid API Key' };
  }

  request.user = user;
});

// API สำหรับตรวจสอบเครดิต
app.get('/api/credit', ({ request }) => {
  const user = request.user as typeof User;
  return { success: true, credit: user.credit };
});

// API สำหรับตรวจสอบสลิป (รับ qr ผ่าน query parameter)
app.get('/api/validate-slip', async ({ request, query }) => {
  const { qr } = query as { qr: string };
  const user = request.user as typeof User;
  if (!qr) return { success: false, message: 'qr is required' };
  const scanQRID = await step_scanQRID(qr)
  if (scanQRID.success === false) return { success: false, message: 'ไม่พบข้อมูลใน QR Code นี้' };
  // ตรวจสอบว่ามีสลิปซ้ำในระบบหรือไม่
  const existingSlip = await findSlipDB(user._id, qr);
  if (existingSlip) {
    //✅มีสลิปในระบบ
    console.log("✅มีสลิปในระบบ")
    const responseData = await findTransDB(qr);
    if (responseData) return { ...responseData ,success: true, message: 'สลิปซ้ำในระบบ', credit: user.credit };



    //❌ไม่มีมีสลิปในระบบ
    if (!responseData) {
      console.log("❌ไม่มีมีสลิปในระบบ")
      const findSlipBank = await slip_api("slipok",qr);
      console.log("ตรวจสอบว่ามีสลิปซ้ำในระบบหรือไม่")
      if (findSlipBank) {
        await updateTransDB(qr, findSlipBank);
        return {data:findSlipBank, success: true, message: 'สลิปซ้ำในระบบ', credit: user.credit };
      }else{
        return { success: false, message: 'สลิปนี้ เก่าเกินไป' };
      }
    }
  }
  // //❌ไม่มีมีสลิปในระบบ 
  // console.log("ไม่พบข้อมูลในฐานข้อมูล");
  // ตรวจสอบว่าเครดิตเพียงพอหรือไม่
  if (user.credit < 0.1) {
    return { success: false, message: 'Insufficient credit' };
  }
  const findSlipBank = await slip_api("slipok",qr);
  if (findSlipBank.success === false) {
    return { success: false, message: 'ไม่พบข้อมูลใน QR Code นี้' };
  }
  if (findSlipBank.success === true) {
    await updateTransDB(qr, findSlipBank);
  }
  // บันทึกสลิปในฐานข้อมูล
  const slip = new Slip({ userId: user._id, qrcodeData: qr});
  await slip.save();
  // หักเครดิต 0.1
  user.credit = Math.round((user.credit - 0.1) * 100) / 100;
  await user.save();
  return {data:findSlipBank, success: true, message: 'Slip validated and credit deducted', credit: user.credit };
});

app.post('/api/topup', async ({ request, body }) => {
  const user = request.user as typeof User;
  const { qr } = body;
  if (!qr) return { success: false, message: 'qr is required' };
  const scanQRID = await step_scanQRID(qr)
  // console.log("step_scanQRID",scanQRID);
  if (scanQRID.success === false) return { success: false, message: 'ไม่พบข้อมูลใน QR Code นี้' };
  // ตรวจสอบว่ามีสลิปซ้ำในระบบหรือไม่
  const responseData = await findTransDB(qr);
  if (responseData) {
    //✅มีสลิปในระบบ
    console.log("✅มีสลิปในระบบ",qr)
    const existingSlip = await findSlipDB(user._id, qr);
    if (!existingSlip) {
      const slip = new Slip({ userId: user._id, qrcodeData: qr});
      await slip.save();
    }
    return {success: false, message: 'สลิปผ่านการเติมในระบบ', credit: user.credit };
  }
  console.log("❌ไม่มีมีสลิปในระบบ")
  if (!responseData) {
    //ยังไม่ผ่านการเติม
    const transaction_data = await slip_api("slipok",qr);
    if (transaction_data.success === false) {
      return { success: false, message: 'ไม่พบข้อมูลใน QR Code นี้' 
    };
  }
  //✅สลิปสแกนผ่าน และ ยังไม่ผ่านการเติม
  const receiver_info = transaction_data.receiver || {};
  const account_name  = receiver_info.displayName
  const account_value = receiver_info.account?.value || transaction_data.ref1 || 'ไม่ระบุ';
  const amount = transaction_data.amount || 0
    if (transaction_data.success === true) await updateTransDB(qr, transaction_data);
    if (receiver_info.account.type == "BANKAC" && checkNameMatch(account_name,env_AccuntName) && checkAccBankDigitsMatch(account_value,env_AccuntValue)){
      //เติมผ่านเลข บัญชี
      await addCredit(user,amount)
      return {success:true,message:`เติมเงินจำนวน ${amount} บาท สำเร็จ\nเครดิตของคุณมี ${user.credit}`}
    }
    if (!(receiver_info.account.type == "BANKAC") && checkAccBankDigitsMatch(account_value,env_Mae_Manee)){
      //เติมผ่านแม่มณี และเลขร้านค้า
      await addCredit(user,amount)
      return {success:true,message:`เติมเงินจำนวน ${amount} บาท สำเร็จ\nเครดิตของคุณมี ${user.credit}`}
    }
  }
  return { success: false, message: 'เติมเงินไม่สำเร็จ' };
});
// เริ่มต้นแอปพลิเคชัน
startApp().catch(console.error);