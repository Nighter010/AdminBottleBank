import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/navbar';
import LoginPage from './components/login';
import RegisterPage from './components/register';
import StudentTable from './components/student';
import RewardsTable from './components/reward';
import TeacherTable from './components/teacher';
import BottleTable from './components/bottle';
import RoomTable from './components/room';
import BinTable from './components/bin';
import BinPage from './components/binRealtime';
import RegisterAdmin from './components/register_admin';
import AdminTable from './components/admin';
import HistoryList from './components/historyList';
import Dashboard from './components/dashboard';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      {user ? (
        <div className="flex min-h-screen">
<Navbar user={user} setUser={setUser} />
          <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/student" element={<StudentTable />} />
              <Route path="/reward" element={<RewardsTable />} />
              <Route path="/teacher" element={<TeacherTable />} />
              <Route path="/bottle" element={<BottleTable />} />
              <Route path="/historyList" element={<HistoryList />} />
              <Route path="/room" element={<RoomTable />} />
              <Route path="/bin" element={<BinTable />} />
              <Route path="/binRealtime" element={<BinPage />} />
              <Route path="/admin" element={<AdminTable />} />
              {/* <Route path="/register_admin" element={<RegisterAdmin />} /> */}
              <Route path="*" element={<BinPage />} />
            </Routes>
          </div>
        </div>
      ) : (
        <div className="container mx-auto mt-10">
          <Routes>
            <Route path="/" element={<LoginPage setUser={setUser} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<LoginPage setUser={setUser} />} />
          </Routes>
        </div>
      )}
    </Router>
  );
}

export default App;
