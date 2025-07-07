import React, { useEffect, useState, useRef } from "react";
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
import {
  getDatabase,
  ref,
  orderByChild,
  get,
  equalTo,
} from "firebase/database";
import { db } from "../firebase";

const StudentTable = () => {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]); // Teacher data from Firebase
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [rfidOptions, setRfidOptions] = useState([]);
  const [rooms, setRooms] = useState([]);

  //ค้นหา กรองข้อมูลหน้า
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getStudentNamesByTcNo = (tc_no) => {
  const studentRooms = students.filter((stu) => stu.tc_no === tc_no && stu.s === 1);
  return studentRooms.map((stu) => `${stu.tc_name}${stu.tc_lname}`);
};

 const getTeacherNameByRoId = (ro_id) => {
    const matchingRoom = rooms.find(
      (room) => room.ro_id.toString() === ro_id.toString()
    );

    if (matchingRoom) {
      const tc_no = matchingRoom.tc_no;
      const matchingTeacher = teachers.find(
        (teacher) => teacher.tc_no === tc_no
      );
      return matchingTeacher
        ? `${matchingTeacher.title} ${matchingTeacher.tc_name} ${matchingTeacher.tc_lname}`
        : "-";
    }

    return "-";
  };

  const filteredStudent = students.filter((student) => {
  const stuMatch =
    student.stu_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.stu_lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.academic_year.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.rfid.toLowerCase().includes(searchTerm.toLowerCase());

  const teacherName = getTeacherNameByRoId(student.ro_id); // ✅ ใช้ ro_id แทน tc_no
  const teacherMatch = teacherName.toLowerCase().includes(searchTerm.toLowerCase());

  return stuMatch || teacherMatch;
});


  const totalPages = Math.ceil(filteredStudent.length / itemsPerPage);
  const paginatedStudents = filteredStudent.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [editedData, setEditedData] = useState({
    title: "",
    stu_name: "",
    stu_lname: "",
    ro_id: 0,
    rfid: "",
  });

  const [newStudentData, setNewStudentData] = useState({
    // stu_no:"",//กรอกรหัสประจำตัวเอง
    title: "",
    stu_name: "",
    stu_lname: "",
    academic_year: "",
    ro_id: 0,
    rfid: "",
  });

  const [nextStuNo, setNextStuNo] = useState(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomCollection = collection(db, "room");
        const roomQuery = query(roomCollection, where("s", "==", parseInt(1)));
        const roomSnapshot = await getDocs(roomQuery);
        const roomList = roomSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRooms(roomList);
      } catch (error) {
        console.error("Error fetching rooms: ", error);
      }
    };

    const fetchRFIDOptions = async () => {
      try {
        const rfidCollection = collection(db, "rfid_req");

        // 🔍 ดึงเฉพาะ document ที่ s === 1
        const rfidQuery = query(
          rfidCollection,
          where("s", "==", 1),
          where("stu_no", "==", "")
        );
        const snapshot = await getDocs(rfidQuery);

        const options = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id_rfid: data.id_rfid,
            time: data.time,
          };
        });

        setRfidOptions(options);
      } catch (error) {
        console.error("Error fetching RFID options: ", error);
      }
    };

    const updateGradeLevel = () => {
      const currentDate = new Date();
      const currentYearAD = currentDate.getFullYear(); // Current year in AD
      const currentMonth = currentDate.getMonth(); // Current month (0 = January, 11 = December)

      const selectedAcademicYear = currentStudent
        ? editedData.academic_year
        : newStudentData.academic_year;

      if (selectedAcademicYear && currentMonth >= 5) {
        // Check if the current month is June or later (5 = June)
        const yearsDifference = currentYearAD - (selectedAcademicYear - 543); // Convert พ.ศ. to AD
        const newGrade = Math.min(6, 1 + yearsDifference); // Assuming 6 years (Primary 1-6)

        // Update the year (grade level)
        if (currentStudent) {
          setEditedData((prevData) => ({
            ...prevData,
            year: newGrade,
          }));
        } else {
          setNewStudentData((prevData) => ({
            ...prevData,
            year: newGrade,
          }));
        }
      }
    };

    const fetchTeachers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const teachersData = usersSnapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter((user) => user.role === "user"); // กรองเฉพาะผู้ใช้ที่มี role เป็น 'user'
        setTeachers(teachersData); // ตั้งค่าข้อมูลใน state
      } catch (error) {
        console.error("Error fetching teachers: ", error);
        alert("Error fetching teachers: " + error.message);
      }
    };

    fetchTeachers();

    updateGradeLevel();
    fetchRFIDOptions();

    fetchStudents();
    fetchRooms();
  }, [newStudentData.academic_year, editedData.academic_year]);

  const fetchStudents = async () => {
    try {
      const studentCollection = collection(db, "students");
      const studentQuery = query(studentCollection, where("s", "==", 1)); // ดึงเฉพาะ s == 1
      const studentSnapshot = await getDocs(studentQuery);
      const studentList = studentSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const maxStuNo = Math.max(
        ...studentList.map((student) => parseInt(student.stu_no)),
        0
      );
      setNextStuNo(maxStuNo + 1);
      setStudents(studentList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students: ", error);
    }
  };

  const handleEdit = (student) => {
    const room = rooms.find((r) => r.ro_id === student.ro_id); // หา room ที่ตรงกับ ro_id ของ student
    setEditedData({
      stu_name: student.stu_name,
      stu_lname: student.stu_lname,
      // academic_year: student.academic_year,
      year: room?.ro_year || "", // ปี ป.
      room: room?.ro_room || "", // ห้อง
      rfid: student.rfid || "",
    });
    setCurrentStudent(student);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const selectedRoom = rooms.find(
      (room) =>
        room.ro_year === Number(editedData.year) &&
        room.ro_room === Number(editedData.room)
    );

    if (selectedRoom) {
      const updatedData = {
        ...editedData,
        ro_id: selectedRoom.ro_id, // ✅ เก็บรหัสห้อง
        rfid: editedData.rfid,
      };

      const studentRef = doc(db, "students", currentStudent.id);
      await updateDoc(studentRef, updatedData);

      const updatedStudents = students.map((student) =>
        student.id === currentStudent.id
          ? { ...student, ...updatedData }
          : student
      );

      setStudents(updatedStudents);
      setIsEditing(false);
      setCurrentStudent(null);
    } else {
      alert("ไม่พบห้องเรียนที่เลือก กรุณาตรวจสอบ ปีและห้องอีกครั้ง");
    }

    // console.log("ปีที่เลือก:", editedData.year);
    // console.log("ห้องที่เลือก:", editedData.room);
  };

  const handleAdd = async () => {
    const studentsCollection = collection(db, "students");
    const studentSnapshot = await getDocs(studentsCollection);

    const selectedRoom = rooms.find(
      (room) =>
        room.ro_year === Number(newStudentData.year) &&
        room.ro_room === Number(newStudentData.room)
    );

    if (!selectedRoom) {
      alert("กรุณาเลือกปีการศึกษาและห้องให้ถูกต้อง");
      return;
    }

    const matchedStudents = [];
    studentSnapshot.forEach((doc) => {
      const data = doc.data();
      if (
        data.academic_year === newStudentData.academic_year &&
        data.ro_id === selectedRoom.ro_id &&
        data.s === 1 // ✅ เพิ่มเงื่อนไขเฉพาะที่ยังใช้งาน
      ) {
        matchedStudents.push(data);
      }
    });

    // const newStuIndex = matchedStudents.length + 1;
    // const paddedIndex = String(newStuIndex).padStart(2, "0");

    // const yearSuffix = newStudentData.academic_year.slice(-2);
    // const roYear = selectedRoom.ro_year.toString();
    // const roRoom = selectedRoom.ro_room.toString();

    // const generatedStuNo = `${yearSuffix}${roYear}${roRoom}${paddedIndex}`; //ไม่ใช้ auto

    const existingStudentQuery = query(
      studentsCollection,
      where("rfid", "==", newStudentData.rfid),
      where("s", "==", 1)
    );
    const existingStudentSnapshot = await getDocs(existingStudentQuery);

    if (!existingStudentSnapshot.empty) {
      alert("RFID นี้มีการบันทึกแล้วในระบบ");
      return;
    }

    const stuNoQuery = query(
  studentsCollection,
  where("stu_no", "==", newStudentData.stu_no),
  where("s", "==", 1)
);
const stuNoSnapshot = await getDocs(stuNoQuery);

if (!stuNoSnapshot.empty) {
  alert("รหัสประจำตัวนี้มีอยู่ในระบบแล้ว");
  return;
}

    const newStudent = {
      stu_no: newStudentData.stu_no,//กรอกรหัสประจำตัวเอง
      // stu_no: generatedStuNo,
      title: newStudentData.title,
      stu_name: newStudentData.stu_name,
      stu_lname: newStudentData.stu_lname,
      ro_id: selectedRoom.ro_id,
      rfid: newStudentData.rfid,
      academic_year: newStudentData.academic_year,
      s: 1,
      score: 0,
    };

    await addDoc(studentsCollection, newStudent);

    // 🔻 อัปเดต rfid_req ให้บันทึก stu_no เข้าไป
    const rfidReqCollection = collection(db, "rfid_req");
    const rfidQuery = query(
      rfidReqCollection,
      where("id_rfid", "==", newStudent.rfid)
    );
    const rfidSnapshot = await getDocs(rfidQuery);

    if (!rfidSnapshot.empty) {
      const rfidDoc = rfidSnapshot.docs[0]; // สมมุติว่า RFID มีแค่รายการเดียวที่ตรง
      await updateDoc(doc(db, "rfid_req", rfidDoc.id), {
        // stu_no: generatedStuNo,
        stu_no: newStudent.stu_no,
      });
    }

    setStudents([...students, newStudent]);
    setIsAdding(false);
    setNewStudentData({
      // stu_no:"",//กรอกรหัสประจำตัวเอง
      title: "",
      stu_name: "",
      stu_lname: "",
      ro_id: 0,
      rfid: "",
      academic_year: "",
      s: 1,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (currentStudent) {
      setEditedData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    } else {
      setNewStudentData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleDelete = async (stu_no) => {
    if (window.confirm("คุณต้องการจะลบข้อมูลนักเรียนคนนี้หรือไม้?")) {
      try {
        const studentCollection = collection(db, "students");
        const studentQuery = query(
          studentCollection,
          where("stu_no", "==", stu_no)
        );
        const querySnapshot = await getDocs(studentQuery);

        // ต้องการ rfid เพื่อไปอัปเดตใน rfid_req
        let studentRFID = "";

        for (const docSnapshot of querySnapshot.docs) {
          const docRef = doc(db, "students", docSnapshot.id);
          const studentData = docSnapshot.data();

          // เก็บ rfid ก่อนลบ
          studentRFID = studentData.rfid;

          // อัปเดตให้ s = 0
          await updateDoc(docRef, { s: 0 });
        }

        // ✅ อัปเดต stu_no ให้ว่างใน rfid_req ถ้า rfid ตรงกัน
        if (studentRFID) {
          const rfidReqCollection = collection(db, "rfid_req");
          const rfidQuery = query(
            rfidReqCollection,
            where("id_rfid", "==", studentRFID)
          );
          const rfidSnapshot = await getDocs(rfidQuery);

          for (const rfidDoc of rfidSnapshot.docs) {
            const rfidDocRef = doc(db, "rfid_req", rfidDoc.id);
            await updateDoc(rfidDocRef, {
              stu_no: "", // เคลียร์ค่า stu_no
            });
          }
        }

        // อัปเดตหน้าเว็บ
        await fetchStudents();
      } catch (error) {
        console.error("Error deleting student and clearing RFID: ", error);
      }
    }
  };

  const handleCancel = () => {
    setNewStudentData({
      title: "",
      stu_name: "",
      stu_lname: "",
      ro_id: 0,
      academic_year: "",
      rfid: "",
    });
    setIsAdding(false);
  };

  
  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.ro_year === b.ro_year) {
      return a.ro_room - b.ro_room; // ถ้า ro_year เท่ากัน ให้เรียง ro_room จากน้อยไปมาก
    }
    return a.ro_year - b.ro_year; // เรียง ro_year จากน้อยไปมาก
  });

  const getRoomDetails = (ro_id) => {
    const room = sortedRooms.find(
      (room) => room.ro_id.toString() === ro_id.toString()
    );
    return room ? `ป. ${room.ro_year}/${room.ro_room}` : "ข้อมูลห้องไม่พบ";
  };

 

  return (
    // <div className="container mx-auto px-4 py-8"> //กำหนดให้ตารางอยู่กลาง
    <div className="container w-full px-4 py-8">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        ข้อมูลนักเรียน
      </h2>

      <div className="mb-4 flex justify-between ">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="ค้นหาชื่อนร.-ครู-ปีการศึกษา-rfid"
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
        <>
          <div className="overflow-auto w-full mx-auto">
            <table className=" w-full text-center rounded-lg overflow-hidden shadow-md mt-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                    รหัส
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                    ชื่อ - นามสกุล
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                    ปีที่เข้าศึกษา
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                    ชั้น
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                    RFID
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                    ครูประจำชั้น
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents
                  .slice() // Create a shallow copy of the users array
                  .sort((a, b) => a.stu_no - b.stu_no) // Sort by tc_no
                  .map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        {student.stu_no}
                      </td>

                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        {student.title} {student.stu_name} {student.stu_lname}
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        {student.academic_year}
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        {getRoomDetails(student.ro_id)}
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        {student.rfid}
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        {getTeacherNameByRoId(student.ro_id)}
                      </td>
                      <td className="border border-gray-200 px-2 py-2 text-center whitespace-nowrap">
                        <div className="flex justify-center space-x-2 ">
                          <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                            onClick={() => handleEdit(student)}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                            onClick={() => handleDelete(student.stu_no)}
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

          {isEditing && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  แก้ไขข้อมูลนักเรียน
                </h3>
                <form>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ชื่อ
                      </label>
                      <input
                        type="text"
                        name="stu_name"
                        value={editedData.stu_name}
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
                        name="stu_lname"
                        value={editedData.stu_lname}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ปีการศึกษา (พ.ศ.)
                      </label>
                      <select
                        name="academic_year"
                        value={
                          currentStudent
                            ? editedData.academic_year
                            : newStudentData.academic_year
                        }
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value=""disabled>เลือกปีการศึกษา...</option>
                        {/* Generate years dynamically from the current year */}
                    {/* {[...Array(7).keys()].map((offset) => {
                          const year = new Date().getFullYear() + 543 - offset; // Convert to Buddhist Era (พ.ศ.)
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div> 
                    */}

                    {/* Dropdown สำหรับปีการศึกษา */}
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          ประถมศึกษาปีที่
                        </label>
                        <select
                          name="year"
                          value={editedData.year}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">เลือกปีการศึกษา...</option>
                          {[...new Set(rooms.map((room) => room.ro_year))].map(
                            (year, index) => (
                              <option key={index} value={year}>
                                ป. {year}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Dropdown สำหรับห้อง */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          ห้อง
                        </label>
                        <select
                          name="room"
                          value={editedData.room}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">เลือกห้อง...</option>
                          {rooms
                            .filter(
                              (room) =>
                                parseInt(room.ro_year) ===
                                parseInt(editedData.year)
                            )
                            .slice() // Create a shallow copy of the users array
                            .sort((a, b) => a.ro_room - b.ro_room) // Sort by tc_no
                            .map((room, index) => (
                              <option key={index} value={room.ro_room}>
                                ห้อง {room.ro_room}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        RFID
                      </label>
                      <select
                        name="rfid"
                        value={editedData.rfid}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">เลือก RFID...</option>
                        {rfidOptions
                          // .filter(rfid => rfid.id_rfid === editedData.rfid)
                          .map((rfid, index) => (
                            <option key={index} value={rfid.id_rfid}>
                              {rfid.id_rfid}
                            </option>
                          ))}
                      </select>
                    </div> */}
                  </div>
                </form>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSave}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-300 hover:bg-gray-500 text-black font-bold py-2 px-4 rounded ml-2"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          )}

          {isAdding && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  เพิ่มข้อมูลนักเรียน
                </h3>
                <form>
                  <div className="space-y-4">
                    {/* //กรณีที่จะให้กรอกรหัสประจำตัวเอง */}
                <div>
  <label className="block text-sm font-medium text-gray-700">
    รหัสประจำตัว
  </label>
  <input
    type="text"
    name="stu_no"
    value={newStudentData.stu_no}
    onChange={(e) => {
      const value = e.target.value;
      // ตรวจสอบว่าเป็นตัวเลข และไม่เกิน 13 ตัว
      if (/^\d{0,13}$/.test(value)) {
        handleInputChange(e);
      }
    }}
    maxLength={13}
    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
  />
</div>


                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        คำนำหน้าชื่อ
                      </label>
                      <select
                        name="title"
                        value={newStudentData.title}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white"
                      >
                        <option value="" disabled>
                          เลือกคำนำหน้า
                        </option>
                        {["เด็กชาย", "เด็กหญิง"].map((title) => (
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
                        name="stu_name"
                        value={newStudentData.stu_name}
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
                        name="stu_lname"
                        value={newStudentData.stu_lname}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    {/* Dropdown for selecting the academic year */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ปีการศึกษา (พ.ศ.)
                      </label>
                      <select
                        name="academic_year"
                        value={
                          currentStudent
                            ? editedData.academic_year
                            : newStudentData.academic_year
                        }
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">เลือกปีการศึกษา...</option>
                        {/* Generate years dynamically from the current year */}
                        {[...Array(7).keys()].map((offset) => {
                          const year = new Date().getFullYear() + 543 - offset; // Convert to Buddhist Era (พ.ศ.)
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Dropdown สำหรับปีการศึกษา */}
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          ประถมศึกษาปีที่
                        </label>
                        <select
                          name="year"
                          value={newStudentData.year}
                          onChange={(e) => {
                            console.log("Selected Year: ", e.target.value); // ✅ ตรวจสอบค่าที่เลือก
                            handleInputChange(e);
                          }}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">เลือกปีการศึกษา...</option>
                          {[...new Set(rooms.map((room) => room.ro_year))].map(
                            (year, index) => (
                              <option key={index} value={year}>
                                ป. {year}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Dropdown สำหรับห้อง */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">
                          ห้อง
                        </label>
                        <select
                          name="room"
                          value={newStudentData.room}
                          onChange={handleInputChange}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">เลือกห้อง...</option>
                          {rooms
                            .filter(
                              (room) =>
                                parseInt(room.ro_year) ===
                                parseInt(newStudentData.year)
                            )
                            .slice() // Create a shallow copy of the users array
                            .sort((a, b) => a.ro_room - b.ro_room) // Sort by tc_no
                            .map((room, index) => (
                              <option key={index} value={room.ro_room}>
                                ห้อง {room.ro_room}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* <div>
            <label className="block text-sm font-medium text-gray-700">คะแนน</label>
            <input
              type="number"
              name="score"
              value={newStudentData.score}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div> */}
                  </div>
                  <div>
                    <div>
                      <label className="block text-sm font-medium pt-3 text-gray-700">
                        เลือก RFID
                      </label>
                         <p className="text-xs text-gray-400 justify-end">*เรียงลำดับจากใหม่-เก่า</p>
                      <select
                        name="rfid"
                        value={newStudentData.rfid}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">เลือก RFID...</option>
                        {rfidOptions.map((rfid, index) => (
                          <option key={index} value={rfid.id_rfid}>
                            {index +1}. {rfid.id_rfid}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </form>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleAdd}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-300 hover:bg-gray-500 text-black font-bold py-2 px-4 rounded ml-2"
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

export default StudentTable;
