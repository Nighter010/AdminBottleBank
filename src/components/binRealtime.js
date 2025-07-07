import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const BinPage = () => {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestId, setLatestId] = useState(null);
  const [currentDate, setCurrentDate] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);

  const formatCurrentDate = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${monthName} ${year}`;
  };

  const formatTimestamp = (timestamp) => {
    if (timestamp && timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const monthName = monthNames[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day} ${monthName} ${year} (${hours}:${minutes} น.)`;
    }
    return '';
  };

  const formatTitle = (title) => {
    if (title === 'เด็กชาย') return 'ด.ช.';
    if (title === 'เด็กหญิง') return 'ด.ญ.';
    return title || '';
  };

  useEffect(() => {
    setCurrentDate(formatCurrentDate());

    const binCollection = collection(db, 'bin');
    const unsubscribe = onSnapshot(binCollection, async (snapshot) => {
      const binList = [];

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
      const endOfDay = startOfDay + 86400;

      for (const binDoc of snapshot.docs) {
        const binData = binDoc.data();

        if (
          !binData.time ||
          !binData.time.seconds ||
          binData.time.seconds < startOfDay ||
          binData.time.seconds >= endOfDay
        ) {
          continue;
        }
        

        if (binData.bot_no && binData.stu_no) {
          const [bottleDocSnap, studentDocSnap] = await Promise.all([
            getDocs(query(collection(db, 'bottle'), where('bot_no', '==', binData.bot_no))),
            getDocs(query(collection(db, 'students'), where('stu_no', '==', binData.stu_no)))
          ]);

          const bottleData = bottleDocSnap.docs[0]?.data();
          const studentData = studentDocSnap.docs[0]?.data();

          let ro_year = '-';
          let ro_room = '-';

          if (studentData?.ro_id) {
            const roomSnap = await getDocs(query(collection(db, 'room'), where('ro_id', '==', studentData.ro_id)));
            const roomData = roomSnap.docs[0]?.data();
            if (roomData) {
              ro_year = roomData.ro_year;
              ro_room = roomData.ro_room;
            }
          }

          if (bottleData && studentData) {
            const botScore = parseFloat(bottleData.bot_score || 0);
            const qty = parseFloat(binData.qty || 0);
            const earnedScore = botScore * qty;

            binList.push({
              id: binDoc.id,
              bin_no: binData.bin_no,
              qty,
              time: binData.time,
              bot_name: bottleData.bot_name,
              title: studentData.title,
              stu_no: studentData.stu_no,
              stu_name: studentData.stu_name,
              stu_lname: studentData.stu_lname,
              year: ro_year,
              room: ro_room,
              bot_score: botScore,
              earned_score: earnedScore,
            });
          }
        }
      }

      // Sort binList by time ascending to calculate cumulative score
      binList.sort((a, b) => a.time?.seconds - b.time?.seconds);

      // Calculate cumulative score per student
      const cumulativeScores = {};
      binList.forEach((bin) => {
        const key = bin.stu_no;
        cumulativeScores[key] = (cumulativeScores[key] || 0) + bin.earned_score;
        bin.total_score = cumulativeScores[key]; // add total_score to each bin entry
      });

      // Then sort binList by time descending for table display
      binList.sort((a, b) => b.time?.seconds - a.time?.seconds);

      if (bins.length > 0 && binList.length > bins.length) {
        const newItems = binList.filter(newBin => !bins.some(oldBin => oldBin.id === newBin.id));
        if (newItems.length > 0) {
          setPopupData(newItems[0]);
          setShowPopup(true);
          setLatestId(newItems[0].id);
          setTimeout(() => {
            setShowPopup(false);
            setLatestId(null);
          }, 8000);
        }
      }

      setBins(binList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [bins]);

  return (
    <div className="container w-full px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6 text-center">การใช้งานถังวันนี้</h1>
      <p className="text-center mb-4 text-lg">{currentDate}</p>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : (

          <div className="overflow-auto w-full mx-auto">
  <table className="w-full text-center rounded-lg overflow-hidden shadow-md">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-2 py-2">เวลา</th>
              <th className="border border-gray-300 px-2 py-2">ชื่อ - นามสกุล</th>
              <th className="border border-gray-300 px-2 py-2">ห้อง</th>
              <th className="border border-gray-300 px-2 py-2">ชนิดขวด</th>
              <th className="border border-gray-300 px-2 py-2">จำนวน</th>
              <th className="border border-gray-300 px-2 py-2">คะแนน/ขวด</th>
              <th className="border border-gray-300 px-2 py-2">คะแนนรวม</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((bin) => (
              <tr
                key={bin.id}
                className={`hover:bg-gray-50 transition-all duration-300 ${bin.id === latestId ? 'bg-yellow-100' : ''}`}
              >
                <td className="border border-gray-300 px-2 py-2">{formatTimestamp(bin.time)}</td>
                <td className="border border-gray-300 px-2 py-2">
                  {formatTitle(bin.title)} {bin.stu_name} {bin.stu_lname}
                </td>
                <td className="border border-gray-300 px-2 py-2">ป.{bin.year}/{bin.room}</td>
                <td className="border border-gray-300 px-2 py-2">{bin.bot_name}</td>
                <td className="border border-gray-300 px-2 py-2">{bin.qty}</td>
                <td className="border border-gray-300 px-2 py-2">{bin.bot_score}</td>
                <td className="border border-gray-300 px-2 py-2">{bin.total_score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

{showPopup && popupData && (
  <div className="fixed top-0 left-0 right-0 bottom-0 flex justify-center items-center bg-gray-800 bg-opacity-50 z-50">
    <div className="bg-white p-10 rounded-2xl shadow-2xl w-[500px] max-w-full">
      <h2 className="text-3xl font-bold text-center mb-4">ข้อมูลใหม่ 🎉</h2>
      <p className="text-xl text-center mb-2">
        {popupData.stu_name} {popupData.stu_lname}, ห้อง {popupData.year}/{popupData.room}
      </p>
      <p className="text-xl text-center mb-2">ชนิดขวด: {popupData.bot_name}</p>
      <p className="text-2xl font-semibold text-green-600 text-center mb-4">
        สุดยอด! {popupData.stu_name} ได้รับคะแนน {popupData.earned_score} คะแนน
      </p>
      <img
        src="check-mark.png"
        alt="Bottle"
        className="mx-auto mt-4 w-40 h-40 object-contain"
      />
    </div>
  </div>
)}
    </div>
  );
};

export default BinPage;
