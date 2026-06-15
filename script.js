// HỆ THỐNG SỐ ĐỊNH DANH (1 ĐẾN 52)
const START_SLOT = 1;
const END_SLOT = 52; 
const SPECIAL_ADMIN_SLOT = 52;

let chosenSlotNumber = localStorage.getItem("user_claimed_slot");
if (chosenSlotNumber !== null) {
  chosenSlotNumber = parseInt(chosenSlotNumber);
}

// Lắng nghe tín hiệu khi component member.html nạp thành công
window.addEventListener("slotsComponentReady", () => {
  initNoticeMarqueeDOM(); // Đảm bảo chạy thông báo chữ chạy
  initRealtimeSlotsSync();
});

document.addEventListener("DOMContentLoaded", () => {
  applyFeatureLockStatus();
  interceptUnauthenticatedActions();
});

// 1. CẤU HÌNH TRẠNG THÁI KHÓA VÀ BẢO VỆ GIAO DIỆN CHƯA ĐĂNG NHẬP
function applyFeatureLockStatus() {
  console.log("-> [Hệ thống] Truy cập với tư cách: " + (chosenSlotNumber ? `Thành viên số ${chosenSlotNumber}` : "Khách vãng lai (Ẩn danh)"));
  
  if (!chosenSlotNumber) {
    // THIẾT LẬP KHÓA GIAO DIỆN (VISUAL LOCK) KHI CHƯA CHỌN SỐ ĐỊNH DANH
    
    // Khóa tất cả các trường nhập liệu trong các Form kỷ niệm và hộp thư
    const inputsToLock = document.querySelectorAll("#memory-form input, #memory-form textarea, #memory-form select, #capsule-form input, #capsule-form textarea, #capsule-form select");
    inputsToLock.forEach(item => {
      item.disabled = true;
      item.placeholder = "🔒 Vui lòng chọn Số định danh lớp để mở khóa tính năng viết...";
      item.style.backgroundColor = "#f5f5f5";
      item.style.cursor = "not-allowed";
    });

    // Khóa luôn các nút bấm Gửi (Submit) trong form
    const buttonsToLock = document.querySelectorAll("#memory-form button[type='submit'], #capsule-form button[type='submit']");
    buttonsToLock.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = "🔒 Đã khóa (Yêu cầu định danh)";
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
    });

    // Ghi đè hàm chuyển Tab (switchTab) mặc định để ngăn khách xem các mục bảo mật
    if (typeof window.switchTab === "function") {
      const originalSwitchTab = window.switchTab;
      window.switchTab = function(tabId) {
        if (tabId !== 'home') {
          alert("🔒 Tính năng đã khóa: Bạn cần chọn số định danh lớp ở góc trên bên phải để vào xem hoặc sử dụng phân hệ này!");
          return false;
        }
        return originalSwitchTab(tabId);
      };
    }

    setTimeout(() => {
      window.showCustomNotice ? window.showCustomNotice("👋 Chào bạn! Hãy chọn số định danh lớp mình (ở góc trên phải) để mở khóa hệ thống nhé.") : null;
    }, 2000);
  }
}

// Hàm trợ lý kiểm tra nhanh (fallback bảo mật)
function checkAuth(event) {
  if (!chosenSlotNumber) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    alert("⚠️ Thao tác thất bại: Bạn vui lòng chọn Số định danh (ở góc trên bên phải màn hình) để tiếp tục!");
    return false;
  }
  return true;
}

// Chặn đứng các hành động click gọi hàm modal từ giao diện index.html
function interceptUnauthenticatedActions() {
  // Chặn nút mở canvas chữ ký
  const originalOpenSignature = window.openSignatureCanvasModal;
  window.openSignatureCanvasModal = function() {
    if (!checkAuth()) return;
    if (typeof originalOpenSignature === "function") originalOpenSignature();
  };

  // Chặn nút mở modal đăng ảnh kỷ niệm
  const originalOpenUploadPhoto = window.openUploadPhotoModal;
  window.openUploadPhotoModal = function() {
    if (!checkAuth()) return;
    if (typeof originalOpenUploadPhoto === "function") originalOpenUploadPhoto();
  };
}

// 2. TẠO THANH CHỮ CHẠY ĐỒNG BỘ REALTIME
function initNoticeMarqueeDOM() {
  const homeSection = document.getElementById("section-home");
  if (!homeSection) return;

  if (document.getElementById("marquee-notice-wrapper")) return;

  const marqueeWrapper = document.createElement("div");
  marqueeWrapper.id = "marquee-notice-wrapper";
  marqueeWrapper.className = "w-full bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex flex-col gap-2 shadow-sm relative overflow-hidden";
  marqueeWrapper.innerHTML = `
    <div class="flex items-center justify-between border-b border-amber-200/60 pb-1">
      <span class="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
        <i class="fa-solid fa-bullhorn text-amber-600 animate-bounce"></i> Bảng Tin Lớp Học Real-time
      </span>
      <button id="btn-edit-notice" onclick="window.openEditNoticeModal()" class="text-[9px] bg-white text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded shadow-sm hover:bg-amber-100 transition-all hidden">
        <i class="fa-solid fa-pen"></i> Sửa tin
      </button>
    </div>
    <div class="overflow-hidden w-full bg-white rounded-lg p-1.5 border border-amber-100">
      <marquee id="marquee-text-content" class="text-xs font-semibold text-amber-900" scrollamount="4">Chào mừng các bạn đến với Trạm Dừng Thanh Xuân số định danh!</marquee>
    </div>
  `;
  homeSection.insertBefore(marqueeWrapper, homeSection.firstChild);

  if (chosenSlotNumber === SPECIAL_ADMIN_SLOT) {
    const editBtn = document.getElementById("btn-edit-notice");
    if (editBtn) editBtn.classList.remove("hidden");
  }

  setTimeout(() => {
    if (window.FB_FIRESTORE && window.db && window.basePath) {
      const { doc, onSnapshot } = window.FB_FIRESTORE;
      const noticeDocRef = doc(window.db, ...window.basePath, "system_notice");
      onSnapshot(noticeDocRef, (docSnap) => {
        const marqueeText = document.getElementById("marquee-text-content");
        if (marqueeText && docSnap.exists()) {
          marqueeText.innerText = docSnap.data().text || "Chào mừng các bạn đến với Trạm Dừng Thanh Xuân!";
        }
      });
    }
  }, 1000);
}

// 3. ĐỒNG BỘ REALTIME DANH SÁCH CHỌN SỐ TRÊN DROPDOWN
function initRealtimeSlotsSync() {
  const selectElement = document.getElementById("slots-dropdown-container");
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">-- Chọn số định danh của bạn --</option>';
  for (let i = START_SLOT; i <= END_SLOT; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.id = `slot-opt-${i}`;
    opt.innerText = i === SPECIAL_ADMIN_SLOT ? `Số ${i} - 👑 Giáo Viên Chủ Nhiệm` : `Số định danh thứ: ${i}`;
    if (chosenSlotNumber === i) opt.selected = true;
    selectElement.appendChild(opt);
  }

  if (chosenSlotNumber !== null) {
    showClaimedProfileUI(chosenSlotNumber);
  }

  setTimeout(() => {
    if (window.FB_FIRESTORE && window.db && window.basePath) {
      const { collection, onSnapshot } = window.FB_FIRESTORE;
      const slotsColRef = collection(window.db, ...window.basePath, "slots");

      onSnapshot(slotsColRef, (snapshot) => {
        for (let i = START_SLOT; i <= END_SLOT; i++) {
          const opt = document.getElementById(`slot-opt-${i}`);
          if (opt) {
            opt.innerText = i === SPECIAL_ADMIN_SLOT ? `Số ${i} - 👑 Giáo Viên Chủ Nhiệm` : `Số định danh thứ: ${i}`;
            opt.disabled = false;
          }
        }
        snapshot.forEach((doc) => {
          const data = doc.data();
          const takenSlot = parseInt(data.slotIndex);
          if (takenSlot && takenSlot !== chosenSlotNumber) {
            const opt = document.getElementById(`slot-opt-${takenSlot}`);
            if (opt) {
              opt.innerText += " (❌ Đã có người nhận)";
              opt.disabled = true;
            }
          }
        });
      });
    }
  }, 1200);
}

// 4. XỬ LÝ KHÓA SỐ KHI BẤM CHỌN DROPDOWN
window.handleSelectSlot = async function (value) {
  if (value === "") return;
  const slotNum = parseInt(value);

  if (window.FB_FIRESTORE && window.db && window.basePath) {
    const { collection, addDoc } = window.FB_FIRESTORE;
    try {
      const slotsColRef = collection(window.db, ...window.basePath, "slots");
      await addDoc(slotsColRef, {
        slotIndex: slotNum,
        timestamp: Date.now()
      });

      localStorage.setItem("user_claimed_slot", slotNum);
      alert(`Đăng ký thành công số định danh cá nhân: Số ${slotNum}`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối đồng bộ đám mây!");
    }
  } else {
    localStorage.setItem("user_claimed_slot", slotNum);
    window.location.reload();
  }
};

// 5. HIỂN THỊ KHỐI PROFILE SAU KHI ĐĂNG KÝ THÀNH CÔNG
function showClaimedProfileUI(slotNum) {
  const selectionState = document.getElementById("widget-selection-state");
  const profileState = document.getElementById("widget-profile-state");
  const avatarNum = document.getElementById("profile-avatar-num");
  const profileName = document.querySelector("#widget-profile-state h4");
  const roleBadge = document.getElementById("profile-role-badge");
  const cardLayout = document.getElementById("profile-card-layout");

  if (avatarNum) avatarNum.innerText = slotNum;
  if (profileName) profileName.innerText = `Thành viên số ${slotNum}`;
  if (roleBadge) roleBadge.innerText = "✨ THÀNH VIÊN LỚP";

  if (slotNum === SPECIAL_ADMIN_SLOT && cardLayout && profileName && roleBadge) {
    cardLayout.className = "flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 p-1.5 rounded-lg border border-amber-400 text-white shadow-md animate-pulse";
    profileName.className = "text-[11px] font-black text-white truncate leading-tight";
    profileName.innerText = "Cô Chủ Nhiệm";
    roleBadge.innerText = "👑 ĐIỀU HÀNH HỆ THỐNG";
    roleBadge.className = "text-[8px] uppercase tracking-widest text-amber-100 font-black leading-none mt-0.5";
  }

  if (selectionState) selectionState.classList.add("hidden");
  if (profileState) profileState.classList.remove("hidden");
}

// 6. HÀM SỬA LỜI NHẮC (ADMIN 52)
window.openEditNoticeModal = async function() {
  if (!checkAuth()) return;
  const currentNotice = document.getElementById("marquee-text-content").innerText;
  const newNotice = prompt("📝 NHẬP NỘI DUNG LỜI NHẮC NHỞ CHO TOÀN LỚP:", currentNotice);
  
  if (newNotice === null) return;
  if (!newNotice.trim()) {
    alert("Nội dung không được để trống!");
    return;
  }

  if (window.FB_FIRESTORE && window.db && window.basePath) {
    const { doc, setDoc } = window.FB_FIRESTORE;
    const noticeDocRef = doc(window.db, ...window.basePath, "system_notice");
    try {
      await setDoc(noticeDocRef, {
        text: newNotice.trim(),
        timestamp: Date.now()
      });
      alert("Đã cập nhật bảng tin lớp học thành công!");
    } catch(err) {
      alert("Không thể lưu: " + err.message);
    }
  }
};