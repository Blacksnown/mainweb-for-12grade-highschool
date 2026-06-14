import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Khai báo biến toàn cục trong module để export
let auth = null;
let db = null;

export async function runFirebaseInit() {
  const appId = typeof __app_id !== "undefined" ? __app_id : "119414904690";

  const rawConfig =
    typeof __firebase_config !== "undefined"
      ? __firebase_config
      : {
          apiKey: "AIzaSyD1uUTctPo44ZAXzXWHUrdmKAqQinZT9zA",
          authDomain: "thanhxuancomotlan.firebaseapp.com",
          projectId: "thanhxuancomotlan",
          storageBucket: "thanhxuancomotlan.firebasestorage.app",
          messagingSenderId: "119414904690",
          appId: "1:119414904690:web:eb1ef88429e71ec912ba0d",
        };

  try {
    const app = initializeApp(rawConfig);

    // Gán giá trị cho các biến module
    auth = getAuth(app);
    db = getFirestore(app);

    // Cấu hình môi trường window toàn cục cho script.js sử dụng
    window.auth = auth;
    window.db = db;
    window.basePath = ["artifacts", appId, "public", "data"];

    console.log("-> [Firebase] Khởi tạo hệ thống thành công!");

    // LẮNG NGHE DANH SÁCH DO ADMIN NHẬP TAY TRÊN DATABASE
    if (window.db) {
      const slotsColRef = collection(
        window.db,
        ...window.basePath,
        "member_slots",
      );
      onSnapshot(slotsColRef, (snapshot) => {
        const slotsData = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const name = data.name || data.claimedBy || "";
          if (name) {
            slotsData[parseInt(doc.id)] = name;
          }
        });
        if (typeof window.updateSlotsUI === "function") {
          window.updateSlotsUI(slotsData);
        }
      });
    }
  } catch (error) {
    console.error("-> [Firebase] Lỗi kết nối cấu hình:", error);
  }

  window._firebaseHelpers = {
    addDocTo: async (col, payload) => {
      if (!window.db) throw new Error("Hệ thống Database chưa sẵn sàng.");
      return await addDoc(
        collection(window.db, ...window.basePath, col),
        payload,
      );
    },
  };
}

export { auth, db };
