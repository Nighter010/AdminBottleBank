import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Import Firebase config
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // Import useNavigate for page navigation

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tcName, setTcName] = useState('');
  const [tcLname, setTcLname] = useState('');
  const [error, setError] = useState(''); // State for error message
  const [isLoading, setIsLoading] = useState(true); // Loading state for fetching tc_no
  const [tcNo, setTcNo] = useState(0); // State to store the next tc_no
  const navigate = useNavigate(); // Hook for navigation

  useEffect(() => {
    const fetchNextTcNo = async () => {
      const teacherCollection = collection(db, 'users2');
      const teacherSnapshot = await getDocs(teacherCollection);
      const teacherList = teacherSnapshot.docs.map(doc => doc.data());
      const maxTcNo = teacherList.reduce((max, teacher) => Math.max(max, parseInt(teacher.tc_no, 10) || 0), 0);
      setTcNo(maxTcNo + 1); // Set the next tc_no
      setIsLoading(false); // Set loading to false after data is fetched
    };

    fetchNextTcNo();
  }, []);

  const handleRegister = () => {
    setError(''); // Reset error before trying to register

    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        
        // Save user info to Firebase Firestore
        const teacherCollection = collection(db, 'users2');
        await addDoc(teacherCollection, {
          tc_no: tcNo,
          tc_name: tcName,
          tc_lname: tcLname,
          email: email // Add additional fields if needed
        });

        console.log('Registered and added to Firestore:', user.email);
        navigate('/'); // Navigate back to login page after successful registration
      })
      .catch((error) => {
        console.error('Error registering:', error.message);

        // Set an error message to display to the user
        if (error.code === 'auth/email-already-in-use') {
          setError('อีเมลนี้ถูกใช้ไปแล้ว');
        } else {
          setError('เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง');
        }
      });
  };

  const handleBackToLogin = () => {
    navigate('/'); // Navigate back to login page
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Register for an account
        </h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded-md text-center">
            {error}
          </div>
        )}
        {!isLoading && (
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
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="tc-name" className="sr-only">First Name</label>
                <input
                  id="tc-name"
                  name="tc_name"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ชื่อจริง"
                  value={tcName}
                  onChange={(e) => setTcName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="tc-lname" className="sr-only">Last Name</label>
                <input
                  id="tc-lname"
                  name="tc_lname"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="นามสกุล"
                  value={tcLname}
                  onChange={(e) => setTcLname(e.target.value)}
                />
              </div>
              
            </div>

            <div>
              <button
                type="submit"
                onClick={handleRegister}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                สมัคร
              </button>
              <div className='py-1'></div>
              <button
                type="submit"
                onClick={handleBackToLogin}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                กลับ
              </button>
            </div>
            
          </form>
        )}
      </div>
    </div>
  );
}
