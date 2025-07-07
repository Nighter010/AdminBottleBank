import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import moment from "moment";

const Dashboard = () => {
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [data, setData] = useState([]);

  const [todayPlastic, setTodayPlastic] = useState(0);
  const [todayMetal, setTodayMetal] = useState(0);

  const [monthPlastic, setMonthPlastic] = useState(0);
  const [monthMetal, setMonthMetal] = useState(0);

  useEffect(() => {
    fetchCounts();
    fetchData();
  }, []);

  const fetchCounts = async () => {
    const studentsSnap = await getDocs(
      query(collection(db, "students"), where("s", "==", 1))
    );
    setStudentCount(studentsSnap.size);

    const teachersQuery = query(
      collection(db, "users"),
      where("role", "==", "user"),
      where("s", "==", 1)
    );
    const teachersSnap = await getDocs(teachersQuery);
    setTeacherCount(teachersSnap.size);
  };

  const fetchData = async () => {
    const binQuery = query(collection(db, "bin"), where("s", "==", 1));
    const binSnapshot = await getDocs(binQuery);

    const binData = binSnapshot.docs
      .map((doc) => {
        const bin = doc.data();
        if (bin.stu_no === undefined || bin.bot_no === undefined) return null;
        return {
          ...bin,
          time: bin.time?.toDate?.() || new Date(bin.time),
          type: bin.bot_no === 1 ? "พลาสติก" : "โลหะ",
          qty: bin.qty,
        };
      })
      .filter(Boolean);

    setData(binData);

    const today = moment();
    const todayData = binData.filter((item) =>
      moment(item.time).isSame(today, "day")
    );
    const monthData = binData.filter((item) =>
      moment(item.time).isSame(today, "month")
    );

    const sumByType = (arr, type) =>
      arr.filter((d) => d.type === type).reduce((sum, d) => sum + d.qty, 0);

    setTodayPlastic(sumByType(todayData, "พลาสติก"));
    setTodayMetal(sumByType(todayData, "โลหะ"));

    setMonthPlastic(sumByType(monthData, "พลาสติก"));
    setMonthMetal(sumByType(monthData, "โลหะ"));
  };

  const chartTodayData = [
    { name: "วันนี้", พลาสติก: todayPlastic, โลหะ: todayMetal },
  ];

  const chartMonthData = [
    { name: "เดือนนี้", พลาสติก: monthPlastic, โลหะ: monthMetal },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* นักเรียน */}
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-700">นักเรียนทั้งหมด</h2>
        <p className="text-4xl font-bold text-blue-600">{studentCount}</p>
      </div>

      {/* ครู */}
      <div className="bg-white rounded-xl shadow p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-700">ครูทั้งหมด</h2>
        <p className="text-4xl font-bold text-green-600">{teacherCount}</p>
      </div>

      {/* ขวดวันนี้ */}
      <div className="bg-white rounded-xl shadow p-6 col-span-1">
        <h2 className="text-xl font-semibold text-center text-gray-700 mb-4">
          จำนวนขวดวันนี้
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartTodayData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="พลาสติก" fill="#34d399" />
            <Bar dataKey="โลหะ" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center mt-4 text-gray-700">
          {" "}
          <span style={{ color: "#4ade80" }}>
            พลาสติก: {todayPlastic} ขวด
          </span>{" "}
          | <span style={{ color: "#60a5fa" }}>โลหะ: {todayMetal} ขวด</span> |
          รวม: {todayPlastic + todayMetal} ขวด
        </div>
      </div>

      {/* ขวดเดือนนี้ */}
      <div className="bg-white rounded-xl shadow p-6 col-span-1">
        <h2 className="text-xl font-semibold text-center text-gray-700 mb-4">
          จำนวนขวดเดือนนี้
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartMonthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="พลาสติก" fill="#34d399" />
            <Bar dataKey="โลหะ" fill="#60a5fa" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center mt-4 text-gray-700">
          {" "}
          <span style={{ color: "#4ade80" }}>
            พลาสติก: {monthPlastic} ขวด
          </span>{" "}
          | <span style={{ color: "#60a5fa" }}>โลหะ: {monthMetal} ขวด</span> |
          รวม: {monthPlastic + monthMetal} ขวด
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
