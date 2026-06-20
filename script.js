// ==========================================
// HỆ THỐNG SỐ ĐỊNH DANH (1 ĐẾN 52)
// ==========================================
const START_SLOT = 1;
const END_SLOT = 52;
const SPECIAL_ADMIN_SLOT = 52;

const SLOT_ACCOUNTS = {
  1: { name: "Chu Thị Quỳnh Anh", role: "Thành viên Lớp" },
  2: { name: "Nguyễn Thị Quỳnh Anh", role: "Thành viên Lớp" },
  3: { name: "Lê Đức Anh", role: "Thành viên Lớp" },
  4: { name: "Lê Văn Anh", role: "Thành viên Lớp" }
};

let chosenSlotNumber = localStorage.getItem("user_claimed_slot");
if (chosenSlotNumber !== null) {
  chosenSlotNumber = parseInt(chosenSlotNumber, 10);
}

let temporarySelectedSlot = null; 
window.currentMemoryFilter = "all";

// ==========================================
// HÀM CƯỠNG CHẾ KHÓA/MỞ TÍNH NĂNG (ANTI-BYPASS)
// ==========================================
function enforceFeatureLockUI() {
  const isAuth = !!chosenSlotNumber;
  
  // 1. Tìm và ẩn/hiện toàn bộ các tab ẩn trừ tab Home
  const tabsToLock = document.querySelectorAll('[onclick^="switchTab"]:not([onclick="switchTab(\'home\')"])');
  tabsToLock.forEach(tab => {
    if (!isAuth) {
      tab.style.setProperty("display", "none", "important"); 
    } else {
      tab.style.display = "inline-flex"; 
    }
  });

  if (!isAuth && window.currentTab !== 'home') {
    window.switchTab?.('home');
  }

  // 2. Khóa form gửi bài trên trang chủ
  const restrictedZones = [
    { id: "memory-form", el: document.getElementById("memory-form") },
    { id: "capsule-form-zone", el: document.getElementById("capsule-form-zone") },
    { id: "photo-upload-zone", el: document.getElementById("photo-upload-zone") }
  ];

  restrictedZones.forEach(zone => {
    if (zone.el) {
      if (!isAuth) {
        zone.el.classList.add("hidden");
        let alertBox = document.getElementById(zone.id + "-lock-alert");
        if (!alertBox) {
          alertBox = document.createElement("div");
          alertBox.id = zone.id + "-lock-alert";
          alertBox.className = "bg-neutral-50 border border-dashed border-neutral-200 text-neutral-500 rounded-2xl p-4 text-center text-xs my-2 font-medium w-full block";
          alertBox.innerHTML = "🔒 Vui lòng lựa chọn số định danh lớp ở góc phải để mở khóa tính năng.";
          zone.el.parentNode.insertBefore(alertBox, zone.el);
        }
      } else {
        zone.el.classList.remove("hidden");
        document.getElementById(zone.id + "-lock-alert")?.remove();
      }
    }
  });
}

function checkAuth() {
  if (!chosenSlotNumber) {
    window.showCustomNotice?.("⚠️ Bạn cần chọn số định danh lớp để thực hiện thao tác này!");
    return false;
  }
  return true;
}

function waitForFirebaseReady(timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    if (window.FB_FIRESTORE && window.db) {
      resolve();
      return;
    }
    let elapsed = 0;
    const interval = setInterval(() => {
      if (window.FB_FIRESTORE && window.db) {
        clearInterval(interval);
        resolve();
        return;
      }
      elapsed += 150;
      if (elapsed >= timeoutMs) {
        clearInterval(interval);
        reject(new Error("Firebase timeout"));
      }
    }, 150);
  });
}

// ==========================================
// ĐỒNG BỘ DỰNG DROPDOWN VÀ NÚT XÁC NHẬN 2 BƯỚC
// ==========================================
function updateWidgetProfileUI() {
  const selectionState = document.getElementById("widget-selection-state");
  const profileState = document.getElementById("widget-profile-state");
  const avatarNum = document.getElementById("profile-avatar-num");
  const profileCard = document.getElementById("profile-card-layout");
  const profileName = profileCard?.querySelector("h4");
  const roleBadge = document.getElementById("profile-role-badge");

  // Dựng tĩnh danh sách 52 số ngay lập tức khi widget load để tránh lỗi trống ô
  const selectElement = document.getElementById("slots-dropdown-container");
  if (selectElement && selectElement.options.length <= 1) {
    selectElement.innerHTML = '<option value="">-- Chọn số định danh --</option>';
    for (let i = START_SLOT; i <= END_SLOT; i++) {
      const opt = document.createElement("option");
      opt.id = `slot-opt-${i}`;
      opt.value = i;
      const accInfo = SLOT_ACCOUNTS[i] ? ` - ${SLOT_ACCOUNTS[i].name}` : "";
      opt.innerText = i === SPECIAL_ADMIN_SLOT ? `Số ${i} - 👑 Giáo Viên Chủ Nhiệm` : `Số định danh: ${i}${accInfo}`;
      selectElement.appendChild(opt);
    }
  }

  // Tạo nút bấm "Truy cập ngay"
  let accessBtn = document.getElementById("widget-access-submit-btn");
  if (!accessBtn && selectionState) {
    accessBtn = document.createElement("button");
    accessBtn.id = "widget-access-submit-btn";
    accessBtn.className = "w-full mt-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-[11px] py-1 px-2 rounded-lg transition-all hidden shadow-sm text-center block animate-fade-in";
    accessBtn.innerText = "👉 Truy cập ngay";
    accessBtn.onclick = window.confirmAccessIdentity;
    selectionState.appendChild(accessBtn);
  }

  if (chosenSlotNumber) {
    if (selectionState) selectionState.classList.add("hidden");
    if (profileState) profileState.classList.remove("hidden");
    if (avatarNum) avatarNum.innerText = chosenSlotNumber;

    if (chosenSlotNumber === SPECIAL_ADMIN_SLOT) {
      if (profileCard) profileCard.className = "flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 p-1.5 rounded-lg border border-amber-400 text-white shadow-md";
      if (profileName) profileName.innerText = "Cô Chủ Nhiệm";
      if (roleBadge) roleBadge.innerText = "👑 ĐIỀU HÀNH HỆ THỐNG";
    } else {
      if (profileCard) profileCard.className = "flex items-center gap-2 bg-gradient-to-br from-brand-100 to-brand-50 p-1.5 rounded-lg border border-brand-200/50 text-neutral-800";
      const account = SLOT_ACCOUNTS[chosenSlotNumber] || { name: `Thành viên số ${chosenSlotNumber}`, role: "Thành viên Lớp" };
      if (profileName) profileName.innerText = account.name;
      if (roleBadge) roleBadge.innerText = account.role;
    }
  } else {
    if (selectionState) selectionState.classList.remove("hidden");
    if (profileState) profileState.classList.add("hidden");
    if (accessBtn) accessBtn.classList.add("hidden");
  }

  enforceFeatureLockUI();
}

window.handleSelectSlot = function(value) {
  const accessBtn = document.getElementById("widget-access-submit-btn");
  if (!value) {
    temporarySelectedSlot = null;
    if (accessBtn) accessBtn.classList.add("hidden");
    return;
  }
  temporarySelectedSlot = parseInt(value, 10);
  if (accessBtn) accessBtn.classList.remove("hidden");
};

window.confirmAccessIdentity = async function() {
  if (!temporarySelectedSlot) return;

  const accountInfo = SLOT_ACCOUNTS[temporarySelectedSlot] || { name: `Thành viên số ${temporarySelectedSlot}` };
  const userConfirmed = confirm(`❓ Bạn có chắc chắn đã chọn đúng danh tính của mình là:\n👉 [Số ${temporarySelectedSlot}: ${accountInfo.name}] không?`);

  if (userConfirmed) {
    chosenSlotNumber = temporarySelectedSlot;
    localStorage.setItem("user_claimed_slot", chosenSlotNumber);
    updateWidgetProfileUI();
    window.location.reload(); // Refresh đồng bộ dữ liệu sạch
  } else {
    const selectElement = document.getElementById("slots-dropdown-container");
    if (selectElement) selectElement.value = "";
    temporarySelectedSlot = null;
    document.getElementById("widget-access-submit-btn")?.classList.add("hidden");
  }
};

window.handleLogoutSlot = function() {
  if (confirm("Bạn có chắc chắn muốn thoát quyền định danh hiện tại không?")) {
    localStorage.removeItem("user_claimed_slot");
    chosenSlotNumber = null;
    window.location.reload();
  }
};

// ==========================================
// ĐỒNG BỘ REALTIME TỪ FIREBASE ĐÁM MÂY
// ==========================================
function initFirestoreRealtime() {
  waitForFirebaseReady()
    .then(() => {
      const { collection, onSnapshot, query, orderBy } = window.FB_FIRESTORE;

      // Realtime bài viết kỷ niệm
      const memoriesRef = collection(window.db, "memories");
      const memoriesQuery = query(memoriesRef, orderBy("timestamp", "desc"));
      onSnapshot(memoriesQuery, (snap) => {
        window.allMemories = [];
        snap.forEach(d => window.allMemories.push({ id: d.id, ...d.data() }));
        renderMemoryFeed();
      });

      // Realtime hòm thư viên nang
      const capsulesRef = collection(window.db, "capsules");
      const capsulesQuery = query(capsulesRef, orderBy("timestamp", "desc"));
      onSnapshot(capsulesQuery, (snap) => {
        const list = document.getElementById("capsules-list");
        if (!list) return;
        list.innerHTML = "";
        snap.forEach(d => {
          const item = d.data();
          const card = document.createElement("div");
          card.className = "rounded-3xl border border-brand-200/70 bg-white p-5 shadow-sm";
          card.innerHTML = `<h4 class="font-bold text-brand-900">${item.author || "Ẩn danh"}</h4><p class="text-sm text-neutral-600 mt-1">${item.message || ""}</p>`;
          list.appendChild(card);
        });
      });

      // Realtime check các ô số đã bị chiếm đóng
      const slotsRef = collection(window.db, "slots");
      onSnapshot(query(slotsRef, orderBy("timestamp", "asc")), (snapshot) => {
        snapshot.forEach((docSnap) => {
          const takenSlot = parseInt(docSnap.data().slotIndex, 10);
          if (takenSlot && takenSlot !== chosenSlotNumber) {
            const opt = document.getElementById(`slot-opt-${takenSlot}`);
            if (opt) {
              opt.innerText += " (❌ Đã nhận)";
              opt.disabled = true;
            }
          }
        });
      });
    });
}

function renderMemoryFeed() {
  const feed = document.getElementById("memories-feed");
  if (!feed || !window.allMemories) return;
  feed.innerHTML = "";
  window.allMemories.forEach(item => {
    const art = document.createElement("article");
    art.className = "bg-white border border-brand-200/60 rounded-3xl p-6 shadow-sm mb-4";
    art.innerHTML = `<h4 class="font-bold text-brand-900 text-lg">${item.author || "Ẩn danh"}</h4><p class="text-sm text-neutral-600 mt-2">${item.text || ""}</p>`;
    feed.appendChild(art);
  });
}

// ==========================================
// KHỞI CHẠY ĐỒNG BỘ ỔN ĐỊNH
// ==========================================
enforceFeatureLockUI();

window.addEventListener("slotsComponentReady", () => {
  updateWidgetProfileUI();
  initFirestoreRealtime();
});

if (document.getElementById("slots-dropdown-container")) {
  updateWidgetProfileUI();
  initFirestoreRealtime();
}