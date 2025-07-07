import { useState } from 'react';
import { UsersIcon } from '@heroicons/react/24/outline';
import { NavLink, useNavigate } from 'react-router-dom';

const initialNavigation = [
  { name: 'สถิติ', path: '/dashboard' },
  { name: 'ข้อมูลนักเรียน', path: '/student' },
  { name: 'ข้อมูลครู', path: '/teacher' },
  { name: 'ข้อมูลห้องเรียน', path: '/room' },
  { name: 'ประวัติรายชื่อ', path: '/historyList' },
  { name: 'ข้อมูลเครื่องแยกขวด', path: '/bin' },
  { name: 'ข้อมูลเครื่อง Real-Time', path: '/binRealtime' },
  { name: 'ข้อมูลของรางวัล', path: '/reward' },
  { name: 'ข้อมูลขวด', path: '/bottle' },
  { name: 'ข้อมูลผู้ดูแลระบบ', path: '/admin' },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar({ user ,setUser }) {
  const navigate = useNavigate();
  const [navigation] = useState(initialNavigation);

 const handleLogout = () => {
    localStorage.removeItem('user');   // ลบข้อมูลจาก localStorage
    setUser(null);                     // อัปเดต state user
    navigate('/');                     // กลับหน้า login
  };

  return (
    <div className="flex min-h-screen">
      {/* Vertical Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col p-4">
        <div className="text-2xl font-bold mb-6">เมนู</div>
        <nav className="flex-1 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                classNames(
                  isActive ? 'bg-gray-900' : 'hover:bg-gray-700',
                  'block rounded-md px-4 py-2 text-base font-medium'
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
        {/* User Info and Logout */}
        <div className="mt-auto border-t border-gray-700 pt-4">
          <div className="flex items-center px-4 mb-2">
            <UsersIcon className="h-5 w-5 mr-2 text-gray-400" />
            <span className="text-sm text-gray-300 truncate">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-red-500 hover:bg-gray-700 rounded-md px-4 py-2 text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Page Content */}
      <main className="flex-1 p-6 bg-gray-100 overflow-y-auto">
        {/* ใส่ Outlet หรือ Route Components ที่นี่ */}
      </main>
    </div>
  );
}
