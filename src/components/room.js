import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase"; // Import Firebase configuration

const RoomTable = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state
  const [isEditing, setIsEditing] = useState(false); // Edit form visibility state
  const [isAdding, setIsAdding] = useState(false); // Add form visibility state
  const [currentRoom, setCurrentRoom] = useState(null); // Current room being edited
  const [teachers, setTeachers] = useState([]); // Teacher data from Firebase

  //ค้นหา กรองข้อมูลหน้า
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getTeacherName = (tc_no) => {
    const matchingTeacher = teachers.find((teacher) => teacher.tc_no === tc_no);
    return matchingTeacher
      ? `${matchingTeacher.tc_name} ${matchingTeacher.tc_lname}`
      : "-";
  };

  const filteredRooms = rooms.filter((room) => {
    const teacherName = getTeacherName(room.tc_no);
    const roomText = `${room.ro_year}/${room.ro_room}`; // รูปแบบ "1/2"

    return (
      room.ro_year
        .toString()
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roomText.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage);
  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [editedData, setEditedData] = useState({
    ro_year: 0,
    ro_room: 0,
    tc_no: "", // รหัสครู
  }); // Edited data state

  const [newRoomData, setNewRoomData] = useState({
    ro_year: 0,
    ro_room: 0,
    tc_no: "", // รหัสครู
  }); // New room data state

  const [nextRoId, setNextRoId] = useState(null); // New room number

  const fetchRooms = async () => {
    const roomCollection = collection(db, "room");
    const q = query(roomCollection, where("s", "==", 1)); // ดึงเฉพาะที่ s = 1
    const roomSnapshot = await getDocs(q); // ใช้ q ที่เป็น query
    const roomList = roomSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Find the highest ro_id
    const maxRoId = Math.max(
      ...roomList.map((room) => parseInt(room.ro_id)),
      0
    );
    setNextRoId(maxRoId + 1); // Set the next room id
    setRooms(roomList);
    setLoading(false); // Set loading to false after data is fetched
  };

  const fetchTeachers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const teachersData = usersSnapshot.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }))
        .filter((user) => user.role === "user" && user.s === 1); // กรอง role="user" และ s=1
      setTeachers(teachersData); // ตั้งค่าข้อมูลใน state
    } catch (error) {
      console.error("Error fetching teachers: ", error);
      alert("Error fetching teachers: " + error.message);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchRooms();
  }, []);

  // Function to handle edit action
  const handleEdit = (room) => {
    setCurrentRoom(room);
    setEditedData({
      ro_year: room.ro_year,
      ro_room: room.ro_room,
      tc_no: room.tc_no || "", // Default to empty if not available
    });
    setIsEditing(true);
  };

  // Function to handle add new room data
  const handleAdd = async () => {
    console.log("New Room Data:", newRoomData);

    // Step 1: Validate form inputs
    if (
      newRoomData.ro_year === undefined ||
      newRoomData.ro_room === undefined ||
      newRoomData.tc_no === undefined
    ) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Step 2: Format ro_id as "ro" + year + room (e.g., ro101 for year 1 room 01)
    const yearStr = String(newRoomData.ro_year); // ปี เช่น 1-6
    const roomStr = String(newRoomData.ro_room).padStart(2, "0"); // ห้อง เช่น 01-10
    const newRoId = `ro${yearStr}${roomStr}`;

    // Step 3: Check for duplicate year and room
    const existingRoom = rooms.find(
      (room) =>
        room.ro_year === Number(newRoomData.ro_year) &&
        room.ro_room === Number(newRoomData.ro_room)
    );

    if (existingRoom) {
      alert("ห้องนี้มีอยู่ในระบบแล้ว");
      return;
    }

    // Step 4: Check if the selected teacher has already two rooms
    const teacherRoomCount = rooms.filter(
      (room) => room.tc_no === newRoomData.tc_no
    ).length;

    if (teacherRoomCount >= 2) {
      alert("ครูนี้มีห้องเรียนแล้วไม่เกิน 2 ห้อง");
      return;
    }

    // Step 5: Define new room data
    const newRoom = {
      ro_id: newRoId,
      ro_year: Number(newRoomData.ro_year),
      ro_room: Number(newRoomData.ro_room),
      tc_no: newRoomData.tc_no,
      s: 1,
    };

    // Step 6: Add new room to Firebase
    const roomsCollection = collection(db, "room");
    await addDoc(roomsCollection, newRoom);

    // Step 7: Add to history_list
    const thaiYear = new Date().getFullYear() + 543;
    const last2DigitsOfYear = thaiYear.toString().slice(-2);
    const last3DigitsOfRoId = newRoId.slice(-3); // เช่น '101' จาก 'ro1101'

    const tcSuffix = newRoom.tc_no ? newRoom.tc_no.slice(-2) : "00";
    const listTeacher = newRoom.tc_no || "";
    const listCode = `${last2DigitsOfYear}${last3DigitsOfRoId}${tcSuffix}`;

    // บันทึกลง history_list
    const historyData = {
      list_code: listCode,
      list_year: thaiYear,
      list_room: newRoId,
      list_teacher: listTeacher,
    };

    await addDoc(collection(db, "history_list"), historyData);

    // Update local state
    setRooms([...rooms, newRoom]);
    setIsAdding(false);
    setNewRoomData({
      ro_year: 0,
      ro_room: 0,
      tc_no: 0,
      s: 1,
    });
    fetchRooms();
    fetchTeachers();
  };

  const handleSave = async () => {
    try {
      console.log("currentRoom:", currentRoom);
      console.log("currentRoom.id:", currentRoom?.id);
      console.log("editedData.tc_no:", editedData?.tc_no);

      // ตรวจสอบว่า currentRoom และ currentRoom.id ถูกกำหนด
      if (!currentRoom || !currentRoom.id) {
        alert("ห้องเรียนไม่ถูกต้องหรือหายไป");
        return;
      }

      // ตรวจสอบว่าเลือกครูหรือไม่
      const selectedTcNo = editedData.tc_no || ""; // หากไม่ได้เลือกครู จะเป็น ""
      const tcSuffix = selectedTcNo ? selectedTcNo.slice(-2) : "00"; // 2 หลักสุดท้าย หรือ "00"

      // ตรวจสอบว่าครูมีห้องเต็ม 2 ห้องหรือไม่
      if (selectedTcNo) {
        const assignedRoomsSnapshot = await getDocs(
          query(collection(db, "room"), where("tc_no", "==", selectedTcNo))
        );

        if (assignedRoomsSnapshot.size >= 2) {
          alert("ไม่สามารถเพิ่มห้องได้ ครูประจำชั้นนี้มีห้องเต็มแล้ว");
          return;
        }
      }

      // อัปเดต tc_no ใน room
      const roomRef = doc(db, "room", currentRoom.id);
      await updateDoc(roomRef, {
        tc_no: selectedTcNo,
      });

      // อัปเดต list_code และ list_teacher ใน history_list
      const historyQuery = query(
        collection(db, "history_list"),
        where("list_room", "==", currentRoom.ro_id)
      );

      const historySnapshot = await getDocs(historyQuery);
      for (const docSnap of historySnapshot.docs) {
        const historyData = docSnap.data();
        const oldListCode = historyData.list_code || "";

        if (oldListCode.length >= 7) {
          const newListCode = oldListCode.slice(0, -2) + tcSuffix;
          const historyRef = doc(db, "history_list", docSnap.id);

          await updateDoc(historyRef, {
            list_teacher: selectedTcNo,
            list_code: newListCode,
          });
        }
      }

      alert("บันทึกข้อมูลสำเร็จ");
      setIsEditing(false);
      fetchRooms();
      fetchTeachers();
    } catch (error) {
      console.error("Error updating room:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  // Function to handle input changes for edit and add
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (currentRoom) {
      setEditedData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    } else {
      setNewRoomData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  // Function to handle delete action with confirmation
  const handleDelete = async (ro_id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะปิดการใช้งานห้องนี้?")) {
      try {
        const roomCollection = collection(db, "room");
        const roomQuery = query(roomCollection, where("ro_id", "==", ro_id));
        const querySnapshot = await getDocs(roomQuery);

        // อัปเดตเอกสารที่มี ro_id ตรงกันให้ s = 0 และ tc_no = 0
        querySnapshot.forEach(async (docSnapshot) => {
          const docRef = doc(db, "room", docSnapshot.id);
          await updateDoc(docRef, { s: 0, tc_no: "" }); // เพิ่มการอัปเดต tc_no เป็น 0
        });

        // อัปเดต state ของ rooms ให้สะท้อนการเปลี่ยนแปลงค่า s และ tc_no ในเอกสาร
        const updatedRooms = rooms.map((room) =>
          room.ro_id === ro_id ? { ...room, s: 0, tc_no: "" } : room
        );
        fetchTeachers();
        fetchRooms();

        setRooms(updatedRooms);
        alert("ห้องถูกปิดการใช้งานเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Error updating room: ", error);
        alert("เกิดข้อผิดพลาดในการปิดการใช้งานห้อง");
      }
    }
  };

  const handleCancel = () => {
    setNewRoomData({
      ro_year: 0,
      ro_room: 0,
      tc_no: "",
    });
    setIsAdding(false);
    setIsEditing(false);
  };

  const handleRemoveTeacher = () => {
    setNewRoomData({
      ...newRoomData,
      tc_no: "",
    });
  };

  const getAvailableRooms = (year) => {
    const usedRooms = rooms
      .filter((room) => room.ro_year === year)
      .map((room) => room.ro_room);

    const allRooms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return allRooms.filter((room) => !usedRooms.includes(room));
  };

  return (
    <div className="container w-full px-4 py-8">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        ข้อมูลห้องเรียน
      </h2>
      <div className="mb-4 flex justify-between ">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="ค้นหาห้องเรียน หรือชื่อครู"
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
            onClick={() => setIsAdding(true)}
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
      ) : (
        // <p>กำลังโหลด...</p>
        <div>
          <div className="overflow-auto w-full mx-auto">
            <table className="w-full text-center rounded-lg overflow-hidden shadow-md">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-2">ลำดับ</th>
                  <th className="border border-gray-200 px-4 py-2">
                    ปีการศึกษา
                  </th>
                  <th className="border border-gray-200 px-4 py-2">
                    ครูประจำชั้น
                  </th>
                  <th className="border border-gray-200 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms
                  .slice()
                  .sort((a, b) => a.ro_id - b.ro_id)
                  .map((room, index) => (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">
                        {index + 1}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        ป. {room.ro_year} / {room.ro_room}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {getTeacherName(room.tc_no)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="flex justify-center gap-2">
                          <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                            onClick={() => handleEdit(room)}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                            onClick={() => handleDelete(room.ro_id)}
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
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                ถัดไป
              </button>
            </div>
          </div>

          {/* Add Form Modal */}
          {isAdding && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">เพิ่มห้องเรียน</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ประถมศึกษาปีที่
                      </label>
                      <select
                        name="ro_year"
                        value={newRoomData.ro_year}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          const availableRooms = getAvailableRooms(value);
                          setNewRoomData((prevData) => ({
                            ...prevData,
                            ro_year: value,
                            ro_room:
                              availableRooms.length > 0 ? availableRooms[0] : 0, // ตั้งค่าเป็นห้องว่างแรก
                          }));
                        }}
                        className="w-full border border-gray-300 px-3 py-2 rounded"
                      >
                        <option value={0}>เลือกปีการศึกษา</option>
                        {[1, 2, 3, 4, 5, 6].map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    {isAdding && newRoomData.ro_year > 0 && (
                      <div className="mb-4">
                        <label className="block mb-2">ห้อง</label>
                        <select
                          name="ro_room"
                          value={newRoomData.ro_room}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 px-3 py-2 rounded"
                        >
                          <option value={0}>เลือกห้อง</option>
                          {getAvailableRooms(newRoomData.ro_year).map(
                            (room) => (
                              <option key={room} value={room}>
                                {room}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    )}
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ห้อง
                      </label>
                      <select
                        name="ro_room"
                        value={newRoomData.ro_room}
                        onChange={(e) =>
                          setNewRoomData({
                            ...newRoomData,
                            ro_room: Number(e.target.value),
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                      >
                        <option value={0}>
                          เลือกห้อง
                        </option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((room) => (
                          <option key={room} value={room}>
                            {room}
                          </option>
                        ))}
                      </select>
                    </div> */}

                    <select
                      name="tc_no"
                      value={newRoomData.tc_no}
                      onChange={(e) =>
                        setNewRoomData({
                          ...newRoomData,
                          tc_no: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                    >
                      <option value={0}>เลือกครู</option>
                      {teachers.map((teacher, index) => (
                        <option key={index} value={teacher.tc_no}>
                          {teacher.tc_name} {teacher.tc_lname}
                        </option>
                      ))}
                    </select>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleAdd}
                      >
                        บันทึก
                      </button>
                      <button
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleCancel}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Form Modal */}
          {isEditing && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">แก้ไขห้องเรียน</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    {/* Teacher Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ครูประจำชั้น
                      </label>
                      <select
                        name="tc_no"
                        value={editedData.tc_no}
                        onChange={(e) =>
                          setEditedData({
                            ...editedData,
                            tc_no: e.target.value,
                          })
                        }
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                      >
                        <option value={0}>เลือกครู</option>
                        {teachers.map((teacher, index) => (
                          <option key={index} value={teacher.tc_no}>
                            {teacher.tc_name} {teacher.tc_lname}
                          </option>
                        ))}
                      </select>

                      {/* ปุ่มลบครู */}
                      <button
                        onClick={handleRemoveTeacher}
                        className="mt-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                      >
                        ลบครู
                      </button>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleSave}
                      >
                        บันทึก
                      </button>
                      <button
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleCancel}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomTable;
