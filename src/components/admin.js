import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  where,
  query,
  updateDoc,
  doc,
  getDoc, // ✅ เพิ่มบรรทัดนี้
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, auth } from "../firebase";
import { RotatingLines } from 'react-loader-spinner';

const AdminTable = () => {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [confirmPassword, setConfirmPassword] = useState("");
  const [adminAuthEmail, setAdminAuthEmail] = useState("");
  const [adminAuthPassword, setAdminAuthPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    
      const [searchTerm, setSearchTerm] = useState("");
       const [currentPage, setCurrentPage] = useState(1);
            const itemsPerPage = 10;

            const filteredAdmin = admins.filter(
        (admin) =>
          admin.admin_name?.toLowerCase().includes(searchTerm.toLowerCase())
        || admin.admin_lname?.toLowerCase().includes(searchTerm.toLowerCase())
        
      );
   
      
      const totalPages = Math.ceil(filteredAdmin.length / itemsPerPage);
      const paginatedAdmins = filteredAdmin.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLname, setEditLname] = useState("");
  


  const [adminName, setAdminName] = useState("");
  const [adminLname, setAdminLname] = useState("");

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
     setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const adminsData = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (user) => user.role === "admin" && (user.s === 1)
        );

      setAdmins(adminsData);
    } catch (error) {
      console.error("Error fetching admins:", error);
     } finally {
    setLoading(false); // สิ้นสุดการโหลด
  }
  };

  const handleAddAdmin = async () => {
    if (
      !email ||
      !password ||
      !confirmPassword ||
      !adminAuthEmail ||
      !adminAuthPassword ||
      !adminName ||
      !adminLname
    ) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (password !== confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน");
      return;
    }

      setIsLoading(true); // เริ่มการโหลด


    try {
      // ยืนยันตัวตน admin ปัจจุบัน

      // await signOut(auth); // logout admin ชั่วคราว

      // เช็ค email ซ้ำ
      // const querySnapshot = await getDocs(collection(db, "users"), where("s", "==", 1));
const q = query(collection(db, "users"), where("s", "==", 1));
const querySnapshot = await getDocs(q);
      const existing = querySnapshot.docs.find(
        (doc) => doc.data().email === email
      );
      if (existing) {
        alert("อีเมลนี้มีอยู่ในระบบแล้ว");
        return;
      }

      // สร้างผู้ใช้ใหม่ใน Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const newUser = userCredential.user;

      // เพิ่มข้อมูลลง Firestore พร้อมชื่อและนามสกุล
      const adminQuery = query(
        collection(db, "users"),
        where("role", "==", "admin"),
        where("s", "==", 1)
      );
      const adminSnapshot = await getDocs(adminQuery);

      let maxIdNum = 0;
      adminSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.admin_id) {
          const numPart = data.admin_id.slice(-2);
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxIdNum) {
            maxIdNum = num;
          }
        }
      });

      const newIdNum = (maxIdNum + 1).toString().padStart(2, "0");
      const newAmId = "am" + newIdNum;

      // เพิ่ม admin ใหม่
      await addDoc(collection(db, "users"), {
        email: newUser.email,
        role: "admin",
        s: 1,
        uid: newUser.uid,
        admin_name: adminName,
        admin_lname: adminLname,
        admin_id: newAmId,
      });

      await signOut(auth);

      alert("เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว");

      setShowModal(false);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setAdminAuthEmail("");
      setAdminAuthPassword("");
      setAdminName("");
      setAdminLname("");
      fetchAdmins();
    } catch (error) {
      console.error("Error:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }finally {
    setIsLoading(false); // สิ้นสุดการโหลด
  }
    
  };

   const handleEditClick = (admin) => {
    setEditId(admin.id);
    setEditName(admin.admin_name);
    setEditLname(admin.admin_lname);
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const adminRef = doc(db, "users", editId);
      await updateDoc(adminRef, {
        admin_name: editName,
        admin_lname: editLname,
      });
      alert("บันทึกการแก้ไขเรียบร้อยแล้ว");
      setEditModal(false);
      fetchAdmins();
    } catch (error) {
      console.error("Error updating admin:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  };

  const handleDelete = async (adminId) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะปิดการใช้งานผู้ดูแลระบบคนนี้?")) {
      try {
        const adminRef = doc(db, "users", adminId);
        const adminDoc = await getDoc(adminRef);
        const adminData = adminDoc.data();
        console.log("adminData:", adminData);

        // 1. ปิดสถานะใน Firestore
        await updateDoc(adminRef, { s: 0 });
        console.log("Firestore updated");

        // 2. เรียก API ลบผู้ใช้ที่ auth
        if (adminData?.uid) {
          const res = await fetch("http://localhost:3000/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uid: adminData.uid }),
          });

          const result = await res.json();
          console.log("Backend response:", result);

          if (!res.ok) {
            throw new Error(result.error || "API responded with error");
          }
        }

        // 3. อัปเดต UI
        setAdmins((prev) => prev.filter((admin) => admin.id !== adminId));
        alert("ปิดการใช้งานผู้ดูแลระบบเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Error disabling admin:", error);
        alert("เกิดข้อผิดพลาดในการปิดการใช้งานผู้ดูแลระบบ");
      }
    }
  };

return (

<div className="container w-full px-4 py-8">
   <h2 className="text-2xl font-semibold mb-6 text-center">ตารางผู้ดูแลระบบ</h2>

      {/* <div className="flex justify-between mb-4">
           <input
          type="text"
          placeholder="ค้นหาชื่อหรือนามสกุล"
          className="border px-3 py-2 rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <button
          onClick={() => setShowModal(true)}
          className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded mb-4 font-bold"
        >
          เพิ่มผู้ดูแลระบบ
        </button>
      </div> */}

        <div className="mb-4 flex justify-between ">
            <div className="flex items-center">
  <input
    type="text"
    placeholder="ค้นหาชื่อหรือนามสกุล"
              className="border px-3 py-2 rounded-md"
    value={searchTerm}
    onChange={(e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1); // รีเซ็ตกลับหน้าแรกเมื่อค้นหา
    }}
  />
    <button
      className="ml-2 bg-orange-600 hover:bg-orange-700
        px-4 py-2 rounded font-bold text-white"
      onClick={() => {
        setSearchTerm("");
        setCurrentPage(1); // รีเซ็ตกลับหน้าแรกเมื่อค้นหา
      }}
    >
      ล้าง
    </button>
     </div>
          <div className="flex items-center">
   <button
              onClick={() => setShowModal(true)}
              className="bg-green-500 hover:bg-green-700
               text-white font-bold py-2 px-4 rounded"
            >
              เพิ่มข้อมูล
            </button>
</div>
</div>


       {loading ? (
          <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
        // <p>กำลังโหลด...</p>
      ) : (
        <>

            <table className="w-full text-center rounded-lg overflow-hidden shadow-md">
        <thead>
    <tr className="bg-gray-100 text-center">
            <th className="py-2 px-4 border-gray-200 border">ลำดับ</th>
            <th className="py-2 px-4 border-gray-200 border">ชื่อ</th>
            <th className="py-2 px-4 border-gray-200 border">นามสกุล</th>
            <th className="py-2 px-4 border-gray-200 border">อีเมล</th>
            <th className="py-2 px-4 border-gray-200 border"></th>
          </tr>
        </thead>
        <tbody>
              {paginatedAdmins
          .filter((admin) =>
            `${admin.admin_name} ${admin.admin_lname}`
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
          .map((admin, index) => (
            <tr key={admin.id} className="hover:bg-gray-50 text-center">
              <td className="py-2 px-4 border border-gray-200">{index + 1}</td>
              <td className="py-2 px-4 border border-gray-200">{admin.admin_name}</td>
              <td className="py-2 px-4 border border-gray-200">{admin.admin_lname}</td>
              <td className="py-2 px-4 border border-gray-200">{admin.email}</td>
              <td className="py-2 px-4 border text-center">
 <div className="flex justify-center space-x-2">
                  <button
                  onClick={() => handleEditClick(admin)}
                  className="bg-blue-500 hover:bg-blue-5ช700 text-white px-3 py-1 rounded font-bold"
                >
                  แก้ไข
                </button>

                <button
                  onClick={() => handleDelete(admin.id)}
                  className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded font-bold"
                >
                  ลบ
                </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        <div className="flex justify-center items-center mt-4 space-x-2">
  <button
    className="px-3 py-1 border rounded disabled:opacity-50"
    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
    disabled={currentPage === 1}
  >
    ก่อนหน้า
  </button>
  <span>
    หน้า {currentPage} จาก {totalPages}
  </span>
  <button
    className="px-3 py-1 border rounded disabled:opacity-50"
    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
    disabled={currentPage === totalPages}
  >
    ถัดไป
  </button>
</div>
       {editModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">แก้ไขข้อมูลผู้ดูแล</h2>
          <div className="space-y-4">
            <input
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="ชื่อ"
            />
            <input
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              value={editLname}
              onChange={(e) => setEditLname(e.target.value)}
              placeholder="นามสกุล"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={handleSaveEdit}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                บันทึก
              </button>
              <button
                onClick={() => setEditModal(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

  {isLoading && (
  <div className="flex justify-center items-center">
    <RotatingLines
      strokeColor="grey"
      strokeWidth="5"
      animationDuration="0.75"
      width="50"
      visible={true}
    />
  </div>
  
)}


      {showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-full max-w-md space-y-4">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        เพิ่มผู้ดูแลระบบ
      </h2>

      <input
        type="text"
        placeholder="ชื่อ"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={adminName}
        onChange={(e) => setAdminName(e.target.value)}
      />

      <input
        type="text"
        placeholder="นามสกุล"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={adminLname}
        onChange={(e) => setAdminLname(e.target.value)}
      />

      <input
        type="email"
        placeholder="อีเมลผู้ใช้ใหม่"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="รหัสผ่านใหม่"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <input
        type="password"
        placeholder="ยืนยันรหัสผ่าน"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <hr className="my-2" />

      <h3 className="text-sm font-medium">ยืนยันตัวตนของผู้ดูแลระบบ</h3>

      <input
        type="email"
        placeholder="อีเมลผู้ดูแลระบบ"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={adminAuthEmail}
        onChange={(e) => setAdminAuthEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="รหัสผ่านผู้ดูแลระบบ"
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
        value={adminAuthPassword}
        onChange={(e) => setAdminAuthPassword(e.target.value)}
      />

      <div className="flex justify-end gap-2 mt-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleAddAdmin}
          disabled={isLoading}
        >
          {isLoading ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button
          className="bg-gray-300 px-4 py-2 rounded"
          onClick={() => {
            setShowModal(false);
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setAdminAuthEmail("");
            setAdminAuthPassword("");
          }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  </div>
)}
</>
      )}

    </div>
  );
};

export default AdminTable;
