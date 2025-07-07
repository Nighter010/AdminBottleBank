import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom'; // Import useNavigate for page navigation
import { signInWithEmailAndPassword ,sendPasswordResetEmail } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore'; // เพิ่ม import สำหรับ Firestore
import { auth, db } from '../firebase'; // auth สำหรับการล็อกอิน, db สำหรับ Firestore

export default function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // State for error message
  const navigate = useNavigate(); // Hook for navigation

  const handleLogin = () => {
    setError(''); // Reset error before trying to log in
  
    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
  
        try {
          // ดึงข้อมูล user จาก Firestore (ตาราง users)
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
  
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
  
            // ตรวจสอบว่า role ของผู้ใช้เป็น admin หรือไม่
            if (userData.role === 'admin' && userData.s === 1) {
              // Save user info to localStorage
              localStorage.setItem('user', JSON.stringify(user));
              setUser(user);
  
              console.log('Logged in as:', user.email);
            } else {
              // กรณีที่ role ไม่ใช่ admin
              setError('คุณไม่มีสิทธิ์สูงสุด');
            }
          } else {
            setError('ไม่พบข้อมูลผู้ใช้');
          }
        } catch (err) {
          console.error('Error fetching user role:', err.message);
          setError('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ กรุณาลองใหม่อีกครั้ง');
        }
      })
      .catch((error) => {
        console.error('Error logging in:', error.message);
  
        // Set an error message to display to the user
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else {
          setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง');
        }
      });
  };

  const handleForgotPassword = async () => {
  if (!email) {
    setError('กรุณากรอกอีเมลก่อนรีเซ็ตรหัสผ่าน');
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert('ลิงก์สำหรับรีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของคุณแล้ว');
  } catch (error) {
    console.error('Error resetting password:', error.message);
    if (error.code === 'auth/user-not-found') {
      setError('ไม่พบผู้ใช้งานที่มีอีเมลนี้');
    } else {
      setError('ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้ กรุณาลองใหม่');
    }
  }
};


  return (
   
      <div className="w-full h-full flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold text-center text-gray-900">
          ธนาคารขวดพลาสติก และโลหะ
        </h1>
        <h2 className="text-1 xl font-bold text-center text-gray-900">
          เข้าสู่ระบบ
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded-md text-center">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="อีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="รหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                จดจำฉัน
              </label>
            </div> */}
          <div className="text-sm">
  <button
    type="button"
    onClick={handleForgotPassword}
    className="font-medium text-indigo-600 hover:text-indigo-500"
  >
    ลืมรหัสผ่าน ?
  </button>
</div>
          </div>

          <div className="mt-4 text-center"> 
            <button
              type="submit"
              onClick={handleLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              เข้าสู่ระบบ
            </button>
            {/* <div className='py-1'></div>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              สมัคร
            </button> */}
          </div>
        
        </form>
      </div>
    </div>
  );
}
