import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

export async function runFirebaseInit() {
  const rawConfig = {
    apiKey: "AIzaSyD1uUTctPo44ZAXzXWHUrdmKAqQinZT9zA",
    authDomain: "thanhxuancomotlan.firebaseapp.com",
    projectId: "thanhxuancomotlan",
    storageBucket: "thanhxuancomotlan.firebasestorage.app",
    messagingSenderId: "119414904690",
    appId: "1:119414904690:web:eb1ef88429e71ec912ba0d",
  };

  try {
    const app = initializeApp(rawConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    window.db = db;
    window.auth = auth;
    window.basePath = [];
    window.FB_FIRESTORE = {
      collection,
      onSnapshot,
      addDoc,
      doc,
      setDoc,
      deleteDoc,
      getDoc,
      getDocs,
      query,
      where,
      orderBy,
    };
    window.FB_AUTH = {
      signInWithEmailAndPassword,
      signOut,
      onAuthStateChanged,
    };
    window.dispatchEvent(new Event("firebaseInitialized"));

    console.log("-> [Firebase] Kết nối hệ thống đám mây thành công!");

    const albumColRef = collection(db, "album");
    const qAlbum = query(albumColRef, orderBy("timestamp", "desc"));

    onSnapshot(qAlbum, (snapshot) => {
      const grid = document.getElementById("photos-grid");
      if (!grid) return;
      grid.innerHTML = "";

      let hasPhoto = false;
      snapshot.forEach((docSnap) => {
        hasPhoto = true;
        const data = docSnap.data();
        const item = document.createElement("div");
        item.className =
          "bg-white border border-brand-200/60 p-2 rounded-xl shadow-sm space-y-1 animate-fade-in";
        item.innerHTML = `
          <img src="${data.imageSrc || ""}" class="w-full aspect-video object-cover rounded-lg shadow-inner" alt="Kỷ niệm"/>
          <p class="text-[10px] text-neutral-600 font-medium truncate flex items-center gap-1 pt-1">
            <i class="fa-solid fa-camera text-brand-700"></i> ${data.author || "Thành viên ẩn danh"}
          </p>
        `;
        grid.appendChild(item);
      });

      if (!hasPhoto) {
        grid.innerHTML = `<div class="col-span-full text-center text-xs text-neutral-400 py-6">Chưa có bức ảnh kỷ niệm nào. Hãy là người đăng đầu tiên!</div>`;
      }
    });
  } catch (error) {
    console.error("-> [Firebase] Lỗi kết nối cấu hình:", error);
  }
}
