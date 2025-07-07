import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const TeacherTable = () => {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const getRoomNamesByTcNo = (tc_no) => {
  const teacherRooms = rooms.filter((room) => room.tc_no === tc_no && room.s === 1);
  return teacherRooms.map((room) => `${room.ro_year}/${room.ro_room}`);
};

const filteredUsers = users.filter((user) => {
  const nameMatch =
    user.tc_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.tc_lname?.toLowerCase().includes(searchTerm.toLowerCase());

  const roomNames = getRoomNamesByTcNo(user.tc_no);
  const roomMatch = roomNames.some((roomName) =>
    roomName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return nameMatch || roomMatch;
});


  // const filteredUsers = users.filter(
  //   (user) =>
  //     user.tc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //     user.tc_lname.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [editedData, setEditedData] = useState({
    title: "",
    tc_name: "",
    tc_lname: "",
  });

  const [newUsersData, setNewUsersData] = useState({
    title: "",
    tc_name: "",
    tc_lname: "",
    email: "",
    password: "",
    role: "user",
  });

  const fetchUsers = async () => {
    const UsersCollection = collection(db, "users");
    const q = query(
      UsersCollection,
      where("s", "==", 1),
      where("role", "==", "user")
    ); // กรองเฉพาะ s = 1
    const UsersSnapshot = await getDocs(q);
    const UsersList = UsersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setUsers(UsersList);
    setLoading(false);
  };

  const fetchRooms = async () => {
    const roomCollection = collection(db, "room");
    const q = query(roomCollection, where("s", "==", 1)); // ดึงเฉพาะที่ s = 1
    const roomSnapshot = await getDocs(q);
    const roomList = roomSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRooms(roomList);
  };

  useEffect(() => {
    fetchUsers();
    fetchRooms();
  }, []);

  const handleEdit = (user) => {
    setCurrentUser(user);
    setEditedData({
      title: user.title,
      tc_name: user.tc_name,
      tc_lname: user.tc_lname,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Proceed to update the user data in Firestore
    const userRef = doc(db, "users", currentUser.id);
    await updateDoc(userRef, {
      ...editedData,
      title: editedData.title,
      tc_name: editedData.tc_name,
      tc_lname: editedData.tc_lname,
    });

    // Fetch updated users list after saving
    const fetchUsers = async () => {
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const usersList = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    };

    await fetchUsers();
    setIsEditing(false);
    setCurrentUser(null);
  };

  const handleAdd = async () => {
    // กรองเฉพาะผู้ใช้งานที่ยัง active (s = 1)
    const activeUsers = users.filter((user) => user.s === 1);

    // หาค่าลำดับ tc ที่มากที่สุด
    const maxTcNumber = Math.max(
      ...activeUsers.map(
        (user) => parseInt(user.tc_no?.replace("tc", ""), 10) || 0
      ),
      0
    );

    const newTcNumber = maxTcNumber + 1;
    const formattedTcNo = `tc${newTcNumber.toString().padStart(2, "0")}`;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUsersData.email,
        newUsersData.password
      );

      const newUser = {
        ...newUsersData,
        tc_no: formattedTcNo,
        uid: userCredential.user.uid,
        role: "user",
        s: 1,
        // password: newUsersData.password
      };

      const teacherCollection = collection(db, "users");
      await addDoc(teacherCollection, newUser);

      setUsers([...users, newUser]);
      setIsAdding(false);
      setNewUsersData({
        title: "",
        tc_name: "",
        tc_lname: "",
        email: "",
        password: "",
        role: "user",
        s: 1,
      });
    } catch (error) {
      console.error("Error adding teacher: ", error);
      alert("Error registering teacher: " + error.message);
    }
  };

  // const handleAdd = async () => {
  //   if (!newUsersData.email || !newUsersData.password) {
  //     alert("กรุณากรอกอีเมลและรหัสผ่าน");
  //     return;
  //   }

  //   try {
  //     // ตรวจสอบว่าอีเมลนี้ถูกใช้ลงทะเบียนแล้วหรือไม่
  //     const signInMethods = await fetchSignInMethodsForEmail(auth, newUsersData.email);

  //     if (signInMethods.length > 0) {
  //       alert("อีเมลนี้ถูกใช้แล้ว กรุณาใช้อีเมลอื่น");
  //       return;
  //     }

  //     // สร้างบัญชีใน Firebase Authentication
  //     const userCredential = await createUserWithEmailAndPassword(
  //       auth,
  //       newUsersData.email,
  //       newUsersData.password
  //     );

  //     const user = userCredential.user;

  //     // ส่งอีเมลยืนยัน
  //     await sendEmailVerification(user);
  //     alert("ส่งอีเมลยืนยันแล้ว! กรุณาตรวจสอบอีเมลของคุณ");

  //     // ออกจากระบบเพื่อรอให้ผู้ใช้ยืนยันอีเมล
  //     auth.signOut();
  //   } catch (error) {
  //     console.error("Error creating user:", error.message);
  //     alert("เกิดข้อผิดพลาด: " + error.message);
  //   }
  // };

  const handleVerifyAndSave = async () => {
    try {
      // ให้ผู้ใช้ล็อกอินอีกครั้ง
      const userCredential = await signInWithEmailAndPassword(
        auth,
        newUsersData.email,
        newUsersData.password
      );

      const user = userCredential.user;

      if (!user.emailVerified) {
        alert("กรุณายืนยันอีเมลก่อนบันทึกข้อมูล");
        return;
      }

      // คำนวณ tc_no ใหม่
      const maxTcNo = Math.max(
        ...users.map((user) => parseInt(user.tc_no, 10) || 0),
        0
      );
      const newTcNo = maxTcNo + 1;

      // บันทึกข้อมูลลง Firestore หลังจากยืนยันอีเมล
      await setDoc(doc(db, "users", user.uid), {
        tc_no: newTcNo,
        uid: user.uid,
        title: newUsersData.title,
        tc_name: newUsersData.tc_name,
        tc_lname: newUsersData.tc_lname,
        email: newUsersData.email,
        role: "user",
        s: 1,
      });

      alert("บันทึกข้อมูลสำเร็จ!");
      setIsAdding(false);
    } catch (error) {
      console.error("Error verifying user:", error.message);
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

const handleDelete = async (tc_no) => {
  const userToUpdate = users.find((user) => user.tc_no === tc_no);
  if (!userToUpdate) return;

  if (window.confirm("คุณแน่ใจหรือไม่ที่จะปิดการใช้งานอาจารย์คนนี้?")) {
    try {
      // ตรวจสอบว่ามีห้องที่ใช้ tc_no นี้ไหม
      const roomCollection = collection(db, "room");
      const q = query(roomCollection, where("tc_no", "==", tc_no));
      const roomSnapshot = await getDocs(q);

      // ✅ ปิดการใช้งานผู้ใช้ครูเสมอ
      const userRef = doc(db, "users", userToUpdate.id);
      await updateDoc(userRef, { s: 0 });

      // ✅ ถ้ามีห้องที่ใช้ tc_no → อัปเดต tc_no ของห้องเหล่านั้นเป็น 0
      if (!roomSnapshot.empty) {
        const updatePromises = roomSnapshot.docs.map((roomDoc) =>
          updateDoc(doc(db, "room", roomDoc.id), { tc_no: 0 })
        );
        await Promise.all(updatePromises);
      }

      // ✅ อัปเดต state
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.tc_no === tc_no ? { ...user, s: 0 } : user
        )
      );

      if (!roomSnapshot.empty) {
        setRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.tc_no === tc_no ? { ...room, tc_no: 0 } : room
          )
        );
      }

      fetchUsers();
      fetchRooms();

      alert(
        roomSnapshot.empty
          ? "อาจารย์ถูกปิดการใช้งานเรียบร้อยแล้ว"
          : "อาจารย์ถูกปิดการใช้งานเรียบร้อยแล้ว และห้องเรียนถูกอัปเดต"
      );
    } catch (error) {
      console.error("Error updating teacher: ", error);
      alert("เกิดข้อผิดพลาดในการปิดการใช้งานอาจารย์");
    }
  }
};



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUsersData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewUsersData({
      title: "",
      tc_name: "",
      tc_lname: "",
      email: "",
      password: "",
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const getAvailableRooms = () => {
    // Get rooms not assigned to any teachers
    const assignedRoomIds = new Set(
      users.flatMap((user) => [user.ro_id, user.ro_id_2])
    );
    return rooms.filter((room) => !assignedRoomIds.has(room.ro_id));
  };

  const findRoomByTcNo = (tc_no) => {
    return rooms.filter((room) => room.tc_no === tc_no);
  };

  return (
    // <div className="container mx-auto px-4 py-8"> //กำหนดตารางไว้ตรงกลาง
    <div className="container w-full px-4 py-8">

         <h2 className="text-2xl font-semibold mb-6 text-center">ข้อมูลครู</h2>

<div className="mb-4 flex justify-between ">
  <div className="flex items-center">
    <input
    type="text"
    placeholder="ค้นหาชื่อครู หรือห้องเรียน"
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
    className="bg-green-500 text-white font-semibold px-4 py-2 rounded hover:bg-green-600"
    onClick={() => setIsAdding(true)}
  >
    เพิ่มครู
  </button>
</div>
</div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : (
        // <p>กำลังโหลด...</p>
        <>
       

          <div className="overflow-x-auto">
            <table className="table-auto w-full text-center rounded-lg overflow-hidden shadow-md">
              <thead>
                <tr className="bg-gray-100 text-center">
                  <th className="border border-gray-200 px-4 py-2 text-center">
                    ลำดับ
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-center">
                    ชื่อ - นามสกุล
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-center">
                    ห้อง
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-center">
                    อีเมล
                  </th>
                  <th className="border border-gray-200 px-4 py-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers
                  .slice()
                  .sort((a, b) => a.tc_no - b.tc_no)
                  .map((user, index) => {
                    const roomsForUser = findRoomByTcNo(user.tc_no);
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 text-center"
                      >
                        <td className="border border-gray-200 px-4 py-2">
                          {index + 1}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {user.title} {user.tc_name} {user.tc_lname}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {roomsForUser.length > 0 ? (
                            roomsForUser.map((room) => (
                              <div key={room.id}>
                                {`ป. ${room.ro_year} / ${room.ro_room}`}
                              </div>
                            ))
                          ) : (
                            <span>ไม่มีข้อมูลห้อง</span>
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {user.email}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-center">
                          <button
                            onClick={() => handleEdit(user)}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(user.tc_no)}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

          </div>

          {/* Edit Teacher Modal */}
          {isEditing && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">แก้ไขข้อมูลครู</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        คำนำหน้าชื่อ
                      </label>
                      <select
                        name="title"
                        value={editedData.title}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            title: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                      >
                        <option value="" disabled>
                          เลือกคำนำหน้า
                        </option>
                        {[
                          "นาย",
                          "นาง",
                          "นางสาว",
                          "ว่าที่ร้อยตรี",
                          "ว่าที่ร้อยตรีหญิง",
                        ].map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ชื่อ
                      </label>
                      <input
                        type="text"
                        name="tc_name"
                        value={editedData.tc_name}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            tc_name: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        นามสกุล
                      </label>
                      <input
                        type="text"
                        name="tc_lname"
                        value={editedData.tc_lname}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            tc_lname: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleSave}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isAdding && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">เพิ่มข้อมูลครู</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        คำนำหน้าชื่อ
                      </label>
                      <select
                        name="title"
                        value={newUsersData.title}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                      >
                        <option value="" disabled>
                          เลือกคำนำหน้า
                        </option>
                        {[
                          "นาย",
                          "นาง",
                          "นางสาว",
                          "ว่าที่ร้อยตรี",
                          "ว่าที่ร้อยตรีหญิง",
                        ].map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ชื่อ
                      </label>
                      <input
                        type="text"
                        name="tc_name"
                        value={newUsersData.tc_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        นามสกุล
                      </label>
                      <input
                        type="text"
                        name="tc_lname"
                        value={newUsersData.tc_lname}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        อีเมล
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={newUsersData.email}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        รหัสผ่าน
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={newUsersData.password}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={handleAdd}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherTable;
