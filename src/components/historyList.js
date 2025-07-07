import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

const HistoryList = () => {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");

  const [teacherName, setTeacherName] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [roomSnap, studentSnap, userSnap] = await Promise.all([
          getDocs(query(collection(db, "room"), where("s", "==", 1))),
          getDocs(query(collection(db, "students"), where("s", "in", [1, 2]))),
          getDocs(query(collection(db, "users"), where("role", "==", "user"), where("s", "==", 1)))
        ]);

        const roomList = roomSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const studentList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const userList = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setRooms(roomList);
        setStudents(studentList);
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

useEffect(() => {
  if (selectedYear && selectedRoomId) {
    const room = rooms.find(r => r.ro_id === selectedRoomId); // ไม่แปลงเป็น int

    if (!room) return;

    const teacher = users.find(u => u.tc_no === room.tc_no); // ตรวจสอบว่า tc_no ตรงกัน
    if (teacher) {
      setTeacherName(`${teacher.title || ""} ${teacher.tc_name} ${teacher.tc_lname}`);
    } else {
      setTeacherName("ไม่พบข้อมูลครูประจำห้อง");
    }

    const filtered = students
      .filter(
        s => s.academic_year === selectedYear && s.ro_id === selectedRoomId // string เปรียบเทียบ string
      )
      .sort((a, b) => (a.stu_no || "").localeCompare(b.stu_no || ""));

    setFilteredStudents(filtered);
  } else {
    setTeacherName("");
    setFilteredStudents([]);
  }
}, [selectedYear, selectedRoomId, rooms, students, users]);


  const years = Array.from(new Set(students.map(s => s.academic_year))).sort();

const roomsInYear = rooms
  .filter(r => {
    const academicRooms = students.filter(s => s.academic_year === selectedYear && s.ro_id === r.ro_id);
    return academicRooms.length > 0;
  })
  .sort((a, b) => {
    if (a.ro_year === b.ro_year) {
      return a.ro_room - b.ro_room;
    }
    return a.ro_year - b.ro_year;
  });


  return (
    <div className="container w-full px-4 py-8">
      <h2 className="text-2xl font-semibold text-center mb-6">ประวัติรายชื่อนักเรียน</h2>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">ปีการศึกษา</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={selectedYear}
            onChange={e => {
              setSelectedYear(e.target.value);
              setSelectedRoomId("");
            }}
          >
            <option value="">-- เลือกปีการศึกษา --</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">ห้อง</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2"
            value={selectedRoomId}
            onChange={e => setSelectedRoomId(e.target.value)}
            disabled={!selectedYear}
          >
            <option value="">-- เลือกห้อง --</option>
           {roomsInYear.map(room => (
  <option key={room.ro_id} value={room.ro_id}>
    ป.{room.ro_year}/{room.ro_room}
  </option>
))}
          </select>
        </div>
      </div>

      {selectedYear && selectedRoomId && teacherName && (
        <div className="my-4 p-4 rounded bg-yellow-100 text-center text-lg font-medium text-gray-800 shadow">
          ครูประจำชั้น: <span className="font-bold">{teacherName}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : (
        <table className="table-auto w-full border border-gray-300 shadow mt-4">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1">รหัสนักเรียน</th>
              <th className="border px-2 py-1">ชื่อนักเรียน</th>
              <th className="border px-2 py-1">RFID</th>
              <th className="border px-2 py-1">คะแนน</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((stu, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{stu.stu_no}</td>
                  <td className="border px-2 py-1">
                    {stu.title} {stu.stu_name} {stu.stu_lname}
                  </td>
                  <td className="border px-2 py-1">{stu.rfid}</td>
                  <td className="border px-2 py-1">{stu.score}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4">ไม่พบนักเรียนในรายการนี้</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HistoryList;
