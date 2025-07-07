import React, { useState } from "react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase"; // นำเข้า Firebase config

function RegisterAdmin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [responseMessage, setResponseMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponseMessage("");

    if (!formData.email || !formData.password) {
      setResponseMessage("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setResponseMessage("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsLoading(true);
    try {
      // สร้างผู้ใช้ใน Firebase Authentication
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // เพิ่มข้อมูลใน Firebase Firestore
      const user = userCredential.user;
      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), {
        email: formData.email,
        role: "admin", // กำหนด role เป็น admin
      });

      setResponseMessage("การลงทะเบียนสำเร็จ!");
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error(error);
      setResponseMessage("เกิดข้อผิดพลาด กรุณาลองอีกครั้ง.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center mb-6">เพิ่มผู้ดูแลระบบ</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              อีเมล
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="กรุณากรอกอีเมล"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              รหัสผ่าน
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="กรุณากรอกรหัสผ่าน"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              ยืนยันรหัสผ่าน
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="กรุณายืนยันรหัสผ่าน"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={isLoading}
            >
              {isLoading ? "กำลังบันทึก..." : "เพิ่ม"}
            </button>
          </div>
        </form>
        {responseMessage && (
          <p className="text-center mt-4 text-red-500">{responseMessage}</p>
        )}
      </div>
    </div>
  );
}

export default RegisterAdmin;
