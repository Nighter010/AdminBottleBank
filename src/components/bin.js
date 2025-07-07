import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  limit,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const BinTable = () => {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [hasLoadedAll, setHasLoadedAll] = useState(false);

  //ค้นหา กรองข้อมูลหน้า
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // const filteredBin = bins.filter(
  //   (bin) =>
  //     bin.bin_no.toString().toLowerCase().includes(searchTerm.toLowerCase())
  // );
  // filteredBin.sort((a, b) => b.time.seconds - a.time.seconds);

  // const totalPages = Math.ceil(filteredBin.length / itemsPerPage);
  // const paginatedBins = filteredBin.slice(
  //   (currentPage - 1) * itemsPerPage,
  //   currentPage * itemsPerPage
  // );

const finalFilteredBins = bins.filter((bin) => {
  const fullName = `${bin.stu_name} ${bin.stu_lname}`.toLowerCase();
  const matchesSearch =
    fullName.includes(searchTerm.toLowerCase()) ||
    bin.bin_no.toString().toLowerCase().includes(searchTerm.toLowerCase());

  if (!selectedDate) return matchesSearch;

  const date = new Date(bin.time.seconds * 1000);
  const selected = new Date(selectedDate);
  const matchesDate =
    date.getDate() === selected.getDate() &&
    date.getMonth() === selected.getMonth() &&
    date.getFullYear() === selected.getFullYear();

  return matchesSearch && matchesDate;
});


  finalFilteredBins.sort((a, b) => b.time.seconds - a.time.seconds);

  const totalPages = Math.ceil(finalFilteredBins.length / itemsPerPage);
  const paginatedBins = finalFilteredBins.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTimestamp = (timestamp) => {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      const day = String(date.getDate()).padStart(2);
      const monthNames = [
        "มกราคม",
        "กุมภาพันธ์",
        "มีนาคม",
        "เมษายน",
        "พฤษภาคม",
        "มิถุนายน",
        "กรกฎาคม",
        "สิงหาคม",
        "กันยายน",
        "ตุลาคม",
        "พฤศจิกายน",
        "ธันวาคม",
      ];
      const monthName = monthNames[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day} ${monthName} ${year} (${hours} : ${minutes} น.)`;
    }
    return "";
  };

  const formatTitle = (title) => {
    if (title === "เด็กชาย") return "ด.ช.";
    if (title === "เด็กหญิง") return "ด.ญ.";
    return title || ""; // เผื่อกรณีไม่มีข้อมูล
  };

  const loadAllBins = async () => {
    if (hasLoadedAll) return;

    const [binSnap, bottleSnap, studentSnap, roomSnap] = await Promise.all([
      getDocs(query(collection(db, "bin"), where("s", "==", 1))),
      getDocs(query(collection(db, "bottle"), where("s", "==", 1))),
      getDocs(query(collection(db, "students"), where("s", "==", 1))),
      getDocs(query(collection(db, "room"), where("s", "==", 1))),
    ]);

    const bottleMap = {};
    bottleSnap.docs.forEach((doc) => {
      const data = doc.data();
      bottleMap[data.bot_no] = data;
    });

    const studentMap = {};
    studentSnap.docs.forEach((doc) => {
      const data = doc.data();
      studentMap[data.stu_no] = data;
    });

    const roomMap = {};
    roomSnap.docs.forEach((doc) => {
      const data = doc.data();
      roomMap[data.ro_id] = data;
    });

    const allBinList = [];

    for (const binDoc of binSnap.docs) {
      const binData = binDoc.data();

      const bottleData = bottleMap[binData.bot_no];
      const studentData = studentMap[binData.stu_no];
      const roomData = studentData?.ro_id ? roomMap[studentData.ro_id] : null;

      if (bottleData && studentData) {
        allBinList.push({
          id: binDoc.id,
          bin_no: binData.bin_no,
          qty: binData.qty,
          time: binData.time,
          bot_name: bottleData.bot_name,
          title: studentData.title,
          stu_name: studentData.stu_name,
          stu_lname: studentData.stu_lname,
          year: roomData?.ro_year || "",
          room: roomData?.ro_room || "",
          score: studentData.score,
          bot_score: bottleData.bot_score,
          total_score: studentData.score + bottleData.bot_score,
        });
      }
    }

    // allBinList.sort((a, b) => b.time.seconds - a.time.seconds); // เรียงจากล่าสุดไปเก่าสุด
    setBins(allBinList);

    setHasLoadedAll(true);
    setLoading(false);
  };

  useEffect(() => {
    loadAllBins();
  }, []);

  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    if (!hasLoadedAll) {
      loadAllBins();
    }
  };

  const handleDelete = async (bin_no) => {
    if (window.confirm("Are you sure you want to delete this bin entry?")) {
      try {
        const binQuery = query(
          collection(db, "bin"),
          where("bin_no", "==", bin_no)
        );
        const querySnapshot = await getDocs(binQuery);

        querySnapshot.forEach(async (docSnapshot) => {
          const docRef = doc(db, "bin", docSnapshot.id);
          await updateDoc(docRef, { s: 0 }); // soft delete
        });

        alert("Bin entry soft-deleted successfully.");
        setBins((prev) => prev.filter((bin) => bin.bin_no !== bin_no));
      } catch (error) {
        console.error("Error deleting bin:", error);
        alert("Failed to delete bin entry.");
      }
    }
  };

  // กรองข้อมูลตามวันที่ที่เลือก
  const filteredBins = selectedDate
    ? bins.filter((bin) => {
        const date = new Date(bin.time.seconds * 1000);
        const selected = new Date(selectedDate);
        return (
          date.getDate() === selected.getDate() &&
          date.getMonth() === selected.getMonth() &&
          date.getFullYear() === selected.getFullYear()
        );
      })
    : bins;

  return (
    <div className="container w-full px-4 py-8">
      <h2 className="text-2xl font-semibold text-center mb-6">ข้อมูลเครื่องแยกขวด</h2>
<div className="mb-4 flex justify-between ">
  {/* ฝั่งค้นหาชื่อนักเรียน */}
  <div className="flex items-center">
    <input
      type="text"
      placeholder="ค้นหาชื่อนักเรียน"
      // className="border px-3 py-1.5 rounded-md"
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

  {/* ฝั่งเลือกวันที่ */}
  <div className="flex items-center">
    <input
      type="date"
      value={selectedDate}
      onChange={(e) => setSelectedDate(e.target.value)}
      className="border border-gray-300 rounded px-2 py-1"
    />
    <button
      className="ml-2 bg-gray-500 hover:bg-gray-700 text-sm px-3 py-2 rounded font-semibold text-white"
      onClick={() => setSelectedDate("")}
    >
      ล้างวันที่
    </button>
  </div>
</div>


      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : (
        // <div className="text-center py-10 text-gray-500 text-sm">กำลังโหลดข้อมูล...</div>
        <div className="overflow-x-auto w-full mx-auto">
          <table className="table-auto w-full mx-auto text-center rounded-lg overflow-hidden shadow-md">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-2">ลำดับ</th>
                <th className="border px-2 py-2">เวลา</th>
                <th className="border px-2 py-2">ชื่อนักเรียน</th>
                <th className="border px-2 py-2">ห้อง</th>
                <th className="border px-2 py-2">ชนิดขวด</th>
                <th className="border px-2 py-2">จำนวน</th>
                <th className="border px-2 py-2">คะแนน/ขวด</th>
                {/* <th className="border px-2 py-2">คะแนนรวม</th> */}

                <th className="border px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {/* .slice().reverse() */}
              {paginatedBins.map((bin,index) => (
                <tr key={bin.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2 whitespace-nowrap">
                {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {formatTimestamp(bin.time)}
                  </td>
                  <td className="border px-3 py-2">
                    {formatTitle(bin.title)}
                    {bin.stu_name} {bin.stu_lname}
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    ป.{bin.year} / {bin.room}
                  </td>
                  <td className="border px-3 py-2">{bin.bot_name}</td>
                  <td className="border px-3 py-2">{bin.qty}</td>
                  <td className="border px-3 py-2">{bin.bot_score}</td>
                  {/* <td className="border px-3 py-2">{bin.total_score}</td> */}

                  <td className="border px-3 py-2">
                    <button
                      className="mx-auto bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded block"
                      onClick={() => handleDelete(bin.bin_no)}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedBins.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-gray-500">
                    ไม่พบข้อมูลในวันที่เลือก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex justify-center items-center space-x-2 mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              ก่อนหน้า
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinTable;
