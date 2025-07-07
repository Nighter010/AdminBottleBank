import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase"; // Import Firebase configuration

const BottleTable = () => {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [currentBottle, setCurrentBottle] = useState(null);
  const [editedData, setEditedData] = useState({
    bot_score: 0,
  });

  const [newBottleData, setNewBottleData] = useState({
    bot_name: "",
    bot_score: "",
  });

  useEffect(() => {
    const fetchBottles = async () => {
      const bottleCollection = collection(db, "bottle");
      const bottleSnapshot = await getDocs(bottleCollection);
      const bottleList = bottleSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setBottles(bottleList);
      setLoading(false);
    };

    fetchBottles();
  }, []);

  // Function to handle edit action
  const handleEdit = (bottle) => {
    setCurrentBottle(bottle);
    setEditedData({
      bot_score: bottle.bot_score,
    });
    setIsEditing(true);
  };

  // Function to handle save edited data
const handleSave = async () => {
  if (currentBottle) {
    const score = Number(editedData.bot_score);

    if (isNaN(score) || score < 0) {
      alert("คะแนนต้องเป็นตัวเลขและต้องไม่ต่ำกว่า 0");
      return; // หยุดการบันทึก
    }

    const bottleRef = doc(db, "bottle", currentBottle.id);

    const updatedData = {
      ...editedData,
      bot_score: score,
    };

    await updateDoc(bottleRef, updatedData);

    const updatedBottles = bottles.map((bottle) =>
      bottle.id === currentBottle.id ? { ...bottle, ...updatedData } : bottle
    );
    setBottles(updatedBottles);
    setIsEditing(false);
    setCurrentBottle(null);

    alert("บันทึกข้อมูลสำเร็จ");
  }
};


  // Function to handle add new bottle data
  const handleAdd = async () => {
    const maxBotNo = Math.max(
      ...bottles.map((bottle) => parseInt(bottle.bot_no, 10) || 0),
      0
    );
    const newBotNo = maxBotNo + 1;
  
    const bottleCollection = collection(db, "bottle");
  
    // Convert bot_score to a number
    const newBottle = {
      ...newBottleData,
      bot_no: newBotNo,
      bot_score: Number(newBottleData.bot_score),
    };
  
    await addDoc(bottleCollection, newBottle);
    setBottles([...bottles, newBottle]);
    setIsAdding(false);
    setNewBottleData({
      bot_name: "",
      bot_score: "",
    });
  }

  // Function to handle delete action with confirmation
  const handleDelete = async (bot_no) => {
    if (window.confirm("Are you sure you want to delete this bottle?")) {
      try {
        const bottleCollection = collection(db, "bottle");
        const bottleQuery = query(
          bottleCollection,
          where("bot_no", "==", bot_no)
        );
        const querySnapshot = await getDocs(bottleQuery);

        querySnapshot.forEach(async (docSnapshot) => {
          const docRef = doc(db, "bottle", docSnapshot.id);
          await deleteDoc(docRef);
        });

        const updatedBottles = bottles.filter(
          (bottle) => bottle.bot_no !== bot_no
        );
        setBottles(updatedBottles);
      } catch (error) {
        console.error("Error deleting bottle: ", error);
      }
    }
  };

  // Function to handle input changes for edit and add
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (currentBottle) {
      setEditedData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    } else {
      setNewBottleData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  return (
    <div className="container w-full px-4 py-8">
       <h2 className="text-2xl font-semibold mb-6 text-center">
            ข้อมูลขวด
          </h2>

          <div className="mb-6 text-center">
            {/* <button
              onClick={() => setIsAdding(true)}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              เพิ่มข้อมูลขวด
            </button> */}
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
      <th className="border border-gray-200 px-4 py-2">ชื่อขวด</th>
      <th className="border border-gray-200 px-4 py-2">คะแนน</th>
      <th className="border border-gray-200 px-4 py-2"></th>
    </tr>
  </thead>
  <tbody>
    {bottles
      .sort((a, b) => a.bot_no - b.bot_no)
      .map((bottle) => (
        <tr key={bottle.id} className="hover:bg-gray-50 text-center">
          <td className="border border-gray-200 px-4 py-2">{bottle.bot_no}</td>
          <td className="border border-gray-200 px-4 py-2">{bottle.bot_name}</td>
          <td className="border border-gray-200 px-4 py-2">{bottle.bot_score}</td>
          <td className="border border-gray-200 px-4 py-2">
            <div className="flex justify-center space-x-2">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                onClick={() => handleEdit(bottle)}
              >
                แก้ไข
              </button>
            </div>
          </td>
        </tr>
      ))}
  </tbody>
</table>

          </div>

          {/* Add Form Modal */}
          {/* {isAdding && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4 text-center">
                  เพิ่มข้อมูลขวด
                </h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ชื่อขวด
                      </label>
                      <input
                        type="text"
                        name="bot_name"
                        value={newBottleData.bot_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        คะแนน
                      </label>
                      <input
                        type="text"
                        name="bot_score"
                        value={newBottleData.bot_score}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleAdd}
                      >
                        บันทึก
                      </button>
                      <button
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
          )} */}

          {/* Edit Form Modal */}
          {isEditing && (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 px-4 sm:px-0">
              <div className="bg-white p-6 rounded shadow-lg w-full max-w-md sm:max-w-sm max-h-screen overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">แก้ไขข้อมูลขวด</h3>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-4">
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700">ชื่อขวด</label>
                      <input
                        type="text"
                        name="bot_name"
                        value={editedData.bot_name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div> */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        คะแนน
                      </label>
                      <input
                        type="number"
                        name="bot_score"
                        value={editedData.bot_score}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        onClick={handleSave}
                      >
                        บันทึก
                      </button>
                      <button
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        onClick={() => setIsEditing(false)}
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

export default BottleTable;
