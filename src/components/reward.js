// src/components/RewardsTable.js
import React, { useEffect, useState } from 'react';
import { db, storage } from '../firebase'; // Import Firebase configuration
import { collection, getDocs, addDoc, updateDoc, doc, query, where  } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const RewardsTable = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true); // Loading state
  const [isEditing, setIsEditing] = useState(false); // Edit form visibility state
  const [isAdding, setIsAdding] = useState(false); // Add form visibility state
  const [currentReward, setCurrentReward] = useState(null); // Current reward being edited

 const [previewImage, setPreviewImage] = useState(null);
  //ค้นหา กรองข้อมูลหน้า
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
      const itemsPerPage = 10;
    
      const filteredReward = rewards.filter(
        (reward) =>
          reward.re_name.toLowerCase().includes(searchTerm.toLowerCase()) 
        // || reward.stu_lname.toLowerCase().includes(searchTerm.toLowerCase())
        
      );
   
      
      const totalPages = Math.ceil(filteredReward.length / itemsPerPage);
      const paginatedRewards = filteredReward.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );


  const [editedData, setEditedData] = useState({
    re_no: 0,
    re_name: '',
    re_qty: 0,
    re_score: 0,
    re_pic: ''
  }); // Edited data state
  const [fileName, setFileName] = useState('');
  const [newRewardData, setNewRewardData] = useState({
    re_name: '',
    re_qty: 0,
    re_score: 0,
    re_pic: null // เก็บไฟล์รูปภาพ
  }); // New reward data state

  const [nextReId, setNextReId] = useState(null); // New reward number

  // ฟังก์ชันดึงข้อมูลรางวัลจาก Firestore
  const fetchRewards = async () => {
    try {
      // กำหนด query เพื่อดึงเฉพาะ reward ที่มี s = 1
      const rewardCollection = collection(db, "reward");
      const rewardQuery = query(rewardCollection, where("s", "==", 1));
      const rewardSnapshot = await getDocs(rewardQuery);
  
      // แปลง snapshot เป็น array ของ reward
      const rewardList = rewardSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      // หา re_no ที่สูงสุดและเพิ่ม 1 สำหรับรางวัลใหม่
      const maxReId = Math.max(...rewardList.map((reward) => parseInt(reward.re_no)), 0);
      setNextReId(maxReId + 1); // ตั้งค่า re_no ถัดไป
      setRewards(rewardList); // อัปเดต state rewards
      setLoading(false); // ตั้งค่า loading เป็น false หลังจากดึงข้อมูลเสร็จ
    } catch (error) {
      console.error("Error fetching rewards:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  // ฟังก์ชันจัดการการแก้ไขรางวัล
  const handleEdit = (reward) => {
    setCurrentReward(reward);
    setEditedData({
      re_no: reward.re_no,
      re_name: reward.re_name,
      re_qty: reward.re_qty,
      re_score: reward.re_score,
      re_pic: reward.re_pic
    });
    setIsEditing(true);
  };

  // ฟังก์ชันจัดการการบันทึกข้อมูลที่แก้ไข
const handleSave = async () => {
  try {
    // ห้ามคะแนนและจำนวน < 0
    if (Number(editedData.re_score) < 0 || Number(editedData.re_qty) < 0) {
      alert("คะแนนและจำนวนต้องไม่ต่ำกว่า 0");
      return;
    }

    if (parseInt(editedData.re_qty) < parseInt(currentReward.re_qty)) {
      alert(`ไม่สามารถลดจำนวนของรางวัลต่ำกว่าที่มีอยู่ (${currentReward.re_qty} ชิ้น) ได้`);
      return;
    }

    let imageUrl = editedData.re_pic;
    if (editedData.new_pic) {
      const imageRef = ref(storage, `reward/${editedData.new_pic.name}`);
      await uploadBytes(imageRef, editedData.new_pic);
      imageUrl = await getDownloadURL(imageRef);
    }

    const rewardRef = doc(db, 'reward', currentReward.id);
    await updateDoc(rewardRef, {
      re_no: editedData.re_no,
      re_name: editedData.re_name,
      re_qty: Number(editedData.re_qty),
      re_score: Number(editedData.re_score),
      re_pic: imageUrl
    });

    alert("บันทึกข้อมูลเรียบร้อยแล้ว");

    const updatedRewards = rewards.map(reward =>
      reward.id === currentReward.id
        ? { ...reward, ...editedData, re_pic: imageUrl }
        : reward
    );
    setRewards(updatedRewards);
    setIsEditing(false);
    setCurrentReward(null);
  } catch (error) {
    console.error("Error updating reward:", error);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
  }
};



  // ฟังก์ชันจัดการการเพิ่มรางวัลใหม่

  
  const handleAdd = async () => {
  try {
    // ห้ามคะแนนและจำนวน < 0
    if (Number(newRewardData.re_score) < 0 || Number(newRewardData.re_qty) < 0) {
      alert("คะแนนและจำนวนต้องไม่ต่ำกว่า 0");
      return;
    }

    let imageUrl = '';
    if (newRewardData.re_pic) {
      const imageRef = ref(storage, `reward/${newRewardData.re_pic.name}`);
      await uploadBytes(imageRef, newRewardData.re_pic);
      imageUrl = await getDownloadURL(imageRef);
    }

    const rewardCollection = collection(db, 'reward');
    const q = query(rewardCollection, where('s', '!=', 0));
    const snapshot = await getDocs(q);

    let existingNumbers = [];
    snapshot.forEach(doc => {
      const reNo = doc.data().re_no;
      if (typeof reNo === 'string' && reNo.startsWith('re')) {
        const num = parseInt(reNo.slice(2));
        if (!isNaN(num)) existingNumbers.push(num);
      }
    });

    const nextNumber = (existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1);
    const paddedNumber = nextNumber.toString().padStart(2, '0');
    const newReNo = `re${paddedNumber}`;

    const newReward = {
      re_no: newReNo,
      re_name: newRewardData.re_name,
      re_qty: Number(newRewardData.re_qty),
      re_score: Number(newRewardData.re_score),
      re_pic: imageUrl,
      s: 1
    };

    await addDoc(rewardCollection, newReward);
    alert("เพิ่มรางวัลเรียบร้อยแล้ว");

    setRewards([...rewards, { ...newReward, id: 'new_id_placeholder' }]);
    setIsAdding(false);
    setNewRewardData({
      re_name: '',
      re_qty: 0,
      re_score: 0,
      re_pic: null,
      s: 1
    });

  } catch (error) {
    console.error("Error adding reward:", error);
    alert("เกิดข้อผิดพลาดในการเพิ่มรางวัล");
  }
};

  

  // ฟังก์ชันจัดการการเปลี่ยนแปลงของ input ในฟอร์ม
  // const handleInputChange = (e) => {
  //   const { name, value, files } = e.target;
  //   if (currentReward) {
  //     if (name === 're_pic') {
  //       setEditedData((prevData) => ({
  //         ...prevData,
  //         new_pic: files[0] // เก็บไฟล์ใหม่ใน editedData
  //       }));
  //     } else {
  //       setEditedData((prevData) => ({
  //         ...prevData,
  //         [name]: value
  //       }));
  //     }
  //   } else {
  //     if (name === 're_pic') {
  //       setNewRewardData((prevData) => ({
  //         ...prevData,
  //         re_pic: files[0] // เก็บไฟล์ใหม่ใน newRewardData
  //       }));
  //     } else {
  //       setNewRewardData((prevData) => ({
  //         ...prevData,
  //         [name]: value
  //       }));
  //     }
  //   }
  // };

  const handleInputChange = (e) => {
  const { name, value, files } = e.target;

  if (name === 're_pic') {
    const file = files[0];
    if (file) {
      setFileName(file.name);
      setPreviewImage(URL.createObjectURL(file));
      if (isEditing) {
        setEditedData((prevData) => ({
          ...prevData,
          new_pic: file, // เก็บไฟล์ใหม่ไว้เพื่ออัปโหลดใน handleSave
        }));
      } else {
        setNewRewardData((prevData) => ({
          ...prevData,
          [name]: file,
        }));
      }
    }
  } else {
    if (isEditing) {
      setEditedData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    } else {
      setNewRewardData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  }
};


  // ฟังก์ชันจัดการการลบรางวัล
  const handleDelete = async (id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบรางวัลนี้?")) {
      try {
        const rewardRef = doc(db, 'reward', id); // อ้างอิงไปที่เอกสารของ reward
        await updateDoc(rewardRef, { s: 0 }); // อัปเดตค่า s ให้เป็น 0

        // อัปเดตรายการรางวัลใน state โดยเปลี่ยนค่า s ของรายการที่ถูก "ลบ"
        setRewards((prevRewards) =>
          prevRewards.map((reward) =>
            reward.id === id ? { ...reward, s: 0 } : reward
          )
        );
        fetchRewards();
        alert("รางวัลถูกปิดการใช้งานเรียบร้อยแล้ว");

      } catch (error) {
        console.error("Error updating reward:", error);
        alert("เกิดข้อผิดพลาดในการปิดการใช้งานรางวัล");
      }
    }
};

  // ฟังก์ชันยกเลิกการแก้ไข
  const handleCancel = () => {
    setIsEditing(false);
    setCurrentReward(null);
    // ไม่รีเซ็ต editedData เพื่อให้ข้อมูลเดิมยังคงอยู่
  };

  return (
    <div className="container w-full px-4 py-8">

         <h2 className="text-2xl font-semibold mb-6 text-center">ข้อมูลของรางวัล</h2>

          <div className="mb-4 flex justify-between ">
            <div className="flex items-center">
  <input
    type="text"
    placeholder="ค้นหาชื่อของรางวัล"
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
        // <p>กำลังโหลด...</p>
      ) : (
        <>
       
          <div className="overflow-auto w-full mx-auto">
  <table className="w-full text-center rounded-lg overflow-hidden shadow-md">
    <thead>
      <tr className="bg-gray-100 text-center">
        <th className="border border-gray-200 px-4 py-2">ลำดับ</th>
        <th className="border border-gray-200 px-4 py-2">ชื่อรางวัล</th>
        <th className="border border-gray-200 px-4 py-2">จำนวน</th>
        <th className="border border-gray-200 px-4 py-2">คะแนนที่ต้องใช้</th>
        <th className="border border-gray-200 px-4 py-2">รูปภาพ</th>
        <th className="border border-gray-200 px-4 py-2"></th>
      </tr>
    </thead>
    <tbody>
  {paginatedRewards
    .sort((a, b) => a.re_no - b.re_no)
    .map((reward,index) => (
      <tr key={reward.id} className="hover:bg-gray-50 text-center">
        <td className="border border-gray-200 px-2 py-2">{index + 1}</td>
        <td className="border border-gray-200 px-2 py-2">{reward.re_name}</td>
        <td className="border border-gray-200 px-2 py-2">{reward.re_qty}</td>
        <td className="border border-gray-200 px-2 py-2">{reward.re_score}</td>
        <td className="border border-gray-200 px-6 py-3">
          {reward.re_pic ? (
            <img
              src={reward.re_pic}
              alt={reward.re_name}
              className="w-16 h-16 object-cover mx-auto"
            />
          ) : (
            'ไม่มีรูปภาพ'
          )}
        </td>
        <td className="border border-gray-200 px-2 py-2">
          <div className="flex justify-center space-x-2">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
              onClick={() => handleEdit(reward)}
            >
              แก้ไข
            </button>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
              onClick={() => handleDelete(reward.id)}
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

</div>


          {/* Add Form Modal */}
          {isAdding && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">เพิ่มรางวัล</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ชื่อรางวัล</label>
                      <input
                        type="text"
                        name="re_name"
                        value={newRewardData.re_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">จำนวน</label>
                      <input
                        type="number"
                        name="re_qty"
                        value={newRewardData.re_qty}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">คะแนนที่ต้องใช้</label>
                      <input
                        type="number"
                        name="re_score"
                        value={newRewardData.re_score}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        required
                      />
                    </div>
                   <div>
        <label className="block text-sm font-medium text-gray-700">รูปภาพ</label>
        <div className="mt-1">
          <label
            htmlFor="re_pic"
            className="cursor-pointer inline-block px-4 py-2 bg-blue-500 text-white font-semibold rounded-md shadow hover:bg-blue-600 transition"
          >
            เลือกรูปภาพ
          </label>
          <input
            id="re_pic"
            type="file"
            name="re_pic"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            required
          />
        {fileName && (
  <div className="mt-2">
    <p className="text-sm text-gray-600 truncate">ไฟล์ที่เลือก: {fileName}</p>
    {previewImage && (
      <img
        src={previewImage}
        alt="Preview"
        className="mt-2 w-24 h-24 object-cover border rounded"
      />
    )}
  </div>
)}

        </div>
      </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleAdd}
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        onClick={() => setIsAdding(false)}
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
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">แก้ไขรางวัล</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">ชื่อรางวัล</label>
                      <input
                        type="text"
                        name="re_name"
                        value={editedData.re_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">จำนวน</label>
                      <input
                        type="number"
                        name="re_qty"
                        value={editedData.re_qty}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">คะแนนที่ต้องใช้</label>
                      <input
                        type="number"
                        name="re_score"
                        value={editedData.re_score}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        required
                      />
                    </div>
                    <div className="mt-1">
  <label
    htmlFor="re_pic"
    className="cursor-pointer inline-block px-4 py-2 bg-blue-500 text-white font-semibold rounded-md shadow hover:bg-blue-600 transition"
  >
    เลือกรูปภาพ
  </label>
  <input
    id="re_pic"
    type="file"
    name="re_pic"
    accept="image/*"
    onChange={handleInputChange}
    className="hidden"
  />

  {/* แสดงชื่อไฟล์ */}
  {fileName && (
    <p className="text-sm text-gray-600 mt-2 truncate">ไฟล์ที่เลือก: {fileName}</p>
  )}

  {/* แสดงรูป preview */}
  {previewImage ? (
    <img
  src={previewImage || editedData.re_pic}
  alt="reward"
  className="w-24 h-24 object-cover"
/>
  ) : (
    editedData.re_pic && (
      <img src={editedData.re_pic} alt={editedData.re_name} className="mt-2 w-20 h-20 object-cover border rounded" />
    )
  )}
</div>

                    <div className="flex justify-end space-x-2 mt-4">
                      <button
                        type="button"
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleSave}
                      >
                        บันทึก
                      </button>
                      <button
                        type="button"
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
        </>
      )}
    </div>
  );
};

export default RewardsTable;
