import requests
from pprint import pprint
class CreditSystemClient:
    def __init__(self, base_url="http://localhost:9999", api_key=None):
        """
        เริ่มต้น Client สำหรับเรียกใช้ API
        :param base_url: URL ฐานของ API (ค่าเริ่มต้นคือ http://localhost:7000)
        :param api_key: API Key สำหรับการยืนยันตัวตน (ถ้ามี)
        """
        self.base_url = base_url
        self.session = requests.Session()  # สร้าง session สำหรับ reuse connection

        # ตั้งค่า headers แบบ global หากมี API Key
        if api_key:
            self.session.headers.update({"x-api-key": api_key})

    def register_user(self, username):
        """
        สร้างผู้ใช้ใหม่และรับ API Key
        :param username: ชื่อผู้ใช้
        :return: ผลลัพธ์จากการลงทะเบียน
        """
        url = f"{self.base_url}/api/register"
        payload = {"username": username}

        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()  # ตรวจสอบสถานะ response
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"success": False, "message": str(e)}

    def change_api_key(self, username, old_api_key):
        """
        เปลี่ยน API Key ของผู้ใช้
        :param username: ชื่อผู้ใช้
        :param old_api_key: API Key เดิม
        :return: ผลลัพธ์จากการเปลี่ยน API Key
        """
        url = f"{self.base_url}/api/change-api-key"
        payload = {"username": username, "oldApiKey": old_api_key}

        try:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"success": False, "message": str(e)}

    def get_credit(self):
        """
        ตรวจสอบเครดิตของผู้ใช้
        :return: ข้อมูลเครดิต
        """
        url = f"{self.base_url}/api/credit"

        try:
            response = self.session.get(url)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"success": False, "message": str(e)}

    def validate_slip(self, qr):
        """
        ตรวจสอบสลิปและหักเครดิต
        :param qr: ข้อมูล QR Code
        :return: ผลลัพธ์จากการตรวจสอบสลิป
        """
        url = f"{self.base_url}/api/validate-slip"
        params = {"qr": qr}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"success": False, "message": str(e)}
    def topup(self, qr):
        """
        ตรวจสอบสลิปและเพิ่มเครดิต
        :param qr: ข้อมูล QR Code
        :return: ผลลัพธ์จากการตรวจสอบสลิป
        """
        url = f"{self.base_url}/api/topup"
        try:
            response = self.session.post(url,data={"qr": qr})
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"success": False, "message": str(e)}
    def close(self):
        """
        ปิด session
        """
        self.session.close()
        
vslip = CreditSystemClient(base_url="http://localhost:9999", api_key="08036b10-7201-4dd1-bd7e-72a59be497a")
print(vslip.get_credit())
pprint(vslip.topup("qrcodeString"))
