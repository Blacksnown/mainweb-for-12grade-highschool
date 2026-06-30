const START_SLOT = 1;
const END_SLOT = 52;
const SPECIAL_NOTIFY_SLOT = 52;
let SLOT_ACCOUNTS = {};
let chosenSlotNumber = sessionStorage.getItem("user_claimed_slot");
if (chosenSlotNumber !== null) {
  chosenSlotNumber = parseInt(chosenSlotNumber, 10);
}
let temporarySelectedSlot = null;
let currentSlotPresenceRef = null;
let currentSlotPresenceInterval = null;
const SLOT_PRESENCE_HEARTBEAT_MS = 15000;
window.currentMemoryFilter = "all";
window.ADMIN_EMAIL = window.ADMIN_EMAIL || "vanh3579#@gmail.com";
window.ADMIN_UID = window.ADMIN_UID || "1xuZEHo6N7ZJcyDEIPDJtXaCBuG3";
window.currentAccessRole = "member";
window.isAdminAccountUser = function (user) {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  const uid = user.uid || "";
  return (
    uid === window.ADMIN_UID ||
    email === (window.ADMIN_EMAIL || "").toLowerCase()
  );
};
window.syncAdminAccessFromAuth = function (user) {
  const isAdmin = window.isAdminAccountUser(user);
  if (isAdmin && !window.isAdminActive) {
    window.activateAdminSession?.();
  } else if (!isAdmin && window.isAdminActive) {
    window.deactivateAdminSession?.();
  }
  window.currentAccessRole = isAdmin ? "admin" : "member";
  window.renderMembers?.();
  window.updateWidgetProfileUI?.();
  window.enforceFeatureLockUI?.();
};

function isFeatureUnlocked() {
  // Admin hoạt động hoặc Thành viên đã chọn số định danh đều được tính là Unlocked
  return !!chosenSlotNumber || !!window.isAdminActive;
}
// ==========================================
// HÀM CƯỠNG CHẾ KHÓA/MỞ TÍNH NĂNG (ANTI-BYPASS)
// ==========================================
function enforceFeatureLockUI() {
  const isAuth = isFeatureUnlocked();

  // 1. Tìm và ẩn/hiện toàn bộ các tab ẩn trừ tab Home
  const tabsToLock = document.querySelectorAll(
    '[onclick^="switchTab"]:not([onclick="switchTab(\'home\')"])',
  );
  tabsToLock.forEach((tab) => {
    if (!isAuth) {
      tab.style.setProperty("display", "none", "important");
    } else {
      tab.style.display = "inline-flex";
    }
  });

  if (!isAuth && window.currentTab !== "home") {
    window.switchTab?.("home");
  }

  // 2. Khóa form gửi bài trên trang chủ
  const restrictedZones = [
    { id: "memory-form", el: document.getElementById("memory-form") },
    {
      id: "capsule-form-zone",
      el: document.getElementById("capsule-form-zone"),
    },
    {
      id: "photo-upload-zone",
      el: document.getElementById("photo-upload-zone"),
    },
  ];

  restrictedZones.forEach((zone) => {
    if (zone.el) {
      if (!isAuth) {
        zone.el.classList.add("hidden");
        let alertBox = document.getElementById(zone.id + "-lock-alert");
        if (!alertBox) {
          alertBox = document.createElement("div");
          alertBox.id = zone.id + "-lock-alert";
          alertBox.className =
            "bg-neutral-50 border border-dashed border-neutral-200 text-neutral-500 rounded-2xl p-4 text-center text-xs my-2 font-medium w-full block";
          alertBox.innerHTML =
            "🔒 Vui lòng đăng nhập bằng định danh để mở khóa tính năng.";
          zone.el.parentNode.insertBefore(alertBox, zone.el);
        }
      } else {
        zone.el.classList.remove("hidden");
        document.getElementById(zone.id + "-lock-alert")?.remove();
      }
    }
  });

  if (typeof window.enforceDeviceLockUI === "function") {
    window.enforceDeviceLockUI();
  }
}

function checkAuth() {
  if (!isFeatureUnlocked()) {
    window.showCustomNotice?.(
      "⚠️ Bạn cần chọn số định danh lớp để thực hiện thao tác này!",
    );
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

const SLOT_PRESENCE_TTL_MS = 30000;

async function claimSlotPresence(slot) {
  if (!slot || !window.db || !window.FB_FIRESTORE) return;
  try {
    currentSlotPresenceRef = window.FB_FIRESTORE.doc(
      window.db,
      "slots",
      String(slot),
    );
    await window.FB_FIRESTORE.setDoc(currentSlotPresenceRef, {
      slotIndex: slot,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn("Không thể cập nhật trạng thái slot:", err);
  }
}

async function releaseSlotPresence() {
  if (!currentSlotPresenceRef || !window.db || !window.FB_FIRESTORE) return;
  try {
    await window.FB_FIRESTORE.deleteDoc(currentSlotPresenceRef);
  } catch (err) {
    console.warn("Không thể xóa trạng thái slot:", err);
  }
  currentSlotPresenceRef = null;
  if (currentSlotPresenceInterval) {
    clearInterval(currentSlotPresenceInterval);
    currentSlotPresenceInterval = null;
  }
}

function startSlotPresenceHeartbeat() {
  if (
    !chosenSlotNumber ||
    !currentSlotPresenceRef ||
    !window.db ||
    !window.FB_FIRESTORE
  )
    return;
  if (currentSlotPresenceInterval) {
    clearInterval(currentSlotPresenceInterval);
  }
  currentSlotPresenceInterval = setInterval(() => {
    if (chosenSlotNumber && currentSlotPresenceRef) {
      window.FB_FIRESTORE.setDoc(currentSlotPresenceRef, {
        slotIndex: chosenSlotNumber,
        timestamp: Date.now(),
      });
    }
  }, SLOT_PRESENCE_HEARTBEAT_MS);
}

async function activateSlotPresence() {
  if (!chosenSlotNumber || !window.db || !window.FB_FIRESTORE) return;
  await claimSlotPresence(chosenSlotNumber);
  startSlotPresenceHeartbeat();
}

function refreshSlotOptions() {
  const selectElement = document.getElementById("slots-dropdown-container");
  if (!selectElement) return;
  for (let i = START_SLOT; i <= END_SLOT; i++) {
    const opt = document.getElementById(`slot-opt-${i}`);
    if (!opt) continue;
    const accInfo = SLOT_ACCOUNTS[i] ? ` - ${SLOT_ACCOUNTS[i].name}` : "";
    opt.innerText =
      i === SPECIAL_NOTIFY_SLOT
        ? `Số ${i} - 💬 Thành viên đặc biệt`
        : `Số định danh: ${i}${accInfo}`;

    // 👇 CHÈN THÊM ĐOẠN NÀY VÀO CUỐI VÒNG LẶP ĐỂ KHÓA Ô ĐÃ CÓ CHỦ
    // if (SLOT_ACCOUNTS[i]) {
    //   opt.disabled = true; // Làm mờ và khóa không cho click chọn nữa
    //   // Mẹo: Nếu muốn ẩn hẳn số đó khỏi danh sách luôn thì dùng dòng dưới thay thế:
    //   // opt.style.display = "none";
    // } else {
    //   opt.disabled = false;
    // }
  }
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
    selectElement.innerHTML =
      '<option value="">-- Chọn số định danh --</option>';
    for (let i = START_SLOT; i <= END_SLOT; i++) {
      const opt = document.createElement("option");
      opt.id = `slot-opt-${i}`;
      opt.value = i;
      const accInfo = SLOT_ACCOUNTS[i] ? ` - ${SLOT_ACCOUNTS[i].name}` : "";
      opt.innerText =
        i === SPECIAL_NOTIFY_SLOT
          ? `Số ${i} - 💬 Cô Hường (Thông báo toàn web)`
          : `Số định danh: ${i}${accInfo}`;
      selectElement.appendChild(opt);
    }
  }
  const moveUpBtn = document.getElementById("slot-move-up-btn");
  const moveDownBtn = document.getElementById("slot-move-down-btn");
  if (!moveUpBtn && selectElement) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex items-center gap-2";
    const upBtn = document.createElement("button");
    upBtn.id = "slot-move-up-btn";
    upBtn.type = "button";
    upBtn.className =
      "w-full bg-brand-100 hover:bg-brand-200 text-brand-900 text-[11px] font-semibold py-1 rounded-lg transition-all";
    upBtn.innerText = "↑ Dịch lên";
    upBtn.onclick = () => window.moveSelectedSlot(-1);
    const downBtn = document.createElement("button");
    downBtn.id = "slot-move-down-btn";
    downBtn.type = "button";
    downBtn.className =
      "w-full bg-brand-100 hover:bg-brand-200 text-brand-900 text-[11px] font-semibold py-1 rounded-lg transition-all";
    downBtn.innerText = "↓ Dịch xuống";
    downBtn.onclick = () => window.moveSelectedSlot(1);
    wrapper.appendChild(upBtn);
    wrapper.appendChild(downBtn);
    const buttonContainer = document.getElementById(
      "widget-action-button-container",
    );
    if (buttonContainer) buttonContainer.appendChild(wrapper);
  }
  // Tạo nút bấm "Truy cập ngay"
  let accessBtn = document.getElementById("widget-access-submit-btn");
  if (!accessBtn && selectionState) {
    accessBtn = document.createElement("button");
    accessBtn.id = "widget-access-submit-btn";
    accessBtn.className =
      "w-full mt-2 bg-brand-700 hover:bg-brand-800 text-white font-bold text-[11px] py-1 px-2 rounded-lg transition-all hidden shadow-sm text-center block animate-fade-in";
    accessBtn.innerText = "👉 Truy cập ngay";
    accessBtn.onclick = window.confirmAccessIdentity;
    selectionState.appendChild(accessBtn);
  }

  const isAdmin = !!window.isAdminActive;
  const isCohuong = chosenSlotNumber === SPECIAL_NOTIFY_SLOT;

  if (chosenSlotNumber || isAdmin) {
    if (selectionState) selectionState.classList.add("hidden");
    if (profileState) profileState.classList.remove("hidden");
    if (avatarNum) avatarNum.innerText = isAdmin ? "ADM" : chosenSlotNumber;

    if (isAdmin) {
      if (profileCard)
        profileCard.className =
          "flex items-center gap-2 bg-gradient-to-r from-brand-900 to-neutral-900 p-1.5 rounded-lg border border-brand-700 text-white shadow-md";
      if (profileName) profileName.innerText = "Quản Trị Viên";
      if (roleBadge) roleBadge.innerText = "🔐 Quyền Admin Toàn Hệ Thống";
    } else if (isCohuong) {
      if (profileCard)
        profileCard.className =
          "flex items-center gap-2 bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 p-1.5 rounded-lg border border-amber-400 text-white shadow-md";
      if (profileName) profileName.innerText = "Cô Hường";
      if (roleBadge) roleBadge.innerText = "💬 Thành viên đặc biệt";
    } else {
      if (profileCard)
        profileCard.className =
          "flex items-center gap-2 bg-gradient-to-br from-brand-100 to-brand-50 p-1.5 rounded-lg border border-brand-200/50 text-neutral-800";
      const account = SLOT_ACCOUNTS[chosenSlotNumber] || {
        name: `Thành viên số ${chosenSlotNumber}`,
        role: "Thành viên Lớp",
      };
      if (profileName) profileName.innerText = account.name;
      if (roleBadge) roleBadge.innerText = account.role;
    }

    if (isCohuong) {
      const cohuongAction = document.getElementById("cohuong-alert-btn");
      if (!cohuongAction) {
        const btn = document.createElement("button");
        btn.id = "cohuong-alert-btn";
        btn.type = "button";
        btn.className =
          "w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] py-1 px-2 rounded-lg transition-all";
        btn.innerText = "📢 Phát thông báo toàn web";
        btn.onclick = window.openCohuongAnnouncementPrompt;
        profileState.appendChild(btn);
      }
    } else {
      document.getElementById("cohuong-alert-btn")?.remove();
    }
  } else {
    if (selectionState) selectionState.classList.remove("hidden");
    if (profileState) profileState.classList.add("hidden");
    if (accessBtn) accessBtn.classList.add("hidden");
  }

  enforceFeatureLockUI();
}

window.handleSelectSlot = function (value) {
  const accessBtn = document.getElementById("widget-access-submit-btn");
  if (!value) {
    temporarySelectedSlot = null;
    if (accessBtn) accessBtn.classList.add("hidden");
    return;
  }
  temporarySelectedSlot = parseInt(value, 10);
  if (accessBtn) accessBtn.classList.remove("hidden");
};
window.moveSelectedSlot = function (direction) {
  const selectElement = document.getElementById("slots-dropdown-container");
  if (!selectElement) return;

  const currentValue = selectElement.value;
  // Nếu chưa chọn số nào, mặc định bắt đầu từ số 1 hoặc 52 tùy hướng bấm
  let currentIndex = currentValue
    ? parseInt(currentValue, 10)
    : direction > 0
      ? START_SLOT - 1
      : END_SLOT + 1;

  let nextIndex = currentIndex + direction;

  // Vòng lặp tự động tìm kiếm và bỏ qua các ô đã bị người khác nhận (disabled)
  while (nextIndex >= START_SLOT && nextIndex <= END_SLOT) {
    const nextOption = selectElement.querySelector(
      `option[value="${nextIndex}"]`,
    );
    if (nextOption && !nextOption.disabled) {
      // Đã tìm thấy ô định danh hợp lệ và còn trống
      selectElement.value = nextIndex;
      window.handleSelectSlot(nextIndex);
      return;
    }
    nextIndex += direction; // Tiếp tục dịch chuyển theo hướng cũ nếu bị trùng ô
  }
};
window.confirmAccessIdentity = async function () {
  if (!temporarySelectedSlot) return;

  const accountInfo = SLOT_ACCOUNTS[temporarySelectedSlot] || {
    name: `Thành viên số ${temporarySelectedSlot}`,
  };
  const userConfirmed = confirm(
    `❓ Bạn có chắc chắn đã chọn đúng danh tính của mình là:\n👉 [Số ${temporarySelectedSlot}: ${accountInfo.name}] không?`,
  );

  if (userConfirmed) {
    chosenSlotNumber = temporarySelectedSlot;
    // THAY ĐỔI: Sử dụng sessionStorage thay vì localStorage để dữ liệu tự hủy khi tắt tab/trình duyệt
    sessionStorage.setItem("user_claimed_slot", chosenSlotNumber);
    await claimSlotPresence(chosenSlotNumber);
    startSlotPresenceHeartbeat();
    updateWidgetProfileUI();
    window.location.reload();
  } else {
    const selectElement = document.getElementById("slots-dropdown-container");
    if (selectElement) selectElement.value = "";
    temporarySelectedSlot = null;
    document
      .getElementById("widget-access-submit-btn")
      ?.classList.add("hidden");
  }
};

window.handleLogoutSlot = async function () {
  if (confirm("Bạn có chắc chắn muốn thoát quyền định danh hiện tại không?")) {
    // THAY ĐỔI: Xóa key từ sessionStorage khi bấm đăng xuất
    sessionStorage.removeItem("user_claimed_slot");
    await releaseSlotPresence();
    chosenSlotNumber = null;
    window.location.reload();
  }
};

window.openCohuongAnnouncementPrompt = async function () {
  const isCohuong = chosenSlotNumber === SPECIAL_NOTIFY_SLOT;
  if (!isCohuong) {
    window.showCustomNotice?.(
      "⚠️ Chỉ tài khoản Cô Hường mới được phát thông báo toàn web.",
    );
    return;
  }
  // Không dùng prompt() cũ nữa, chuyển sang hiển thị Modal HTML đã chuẩn bị sẵn
  const modal = document.getElementById("cohuong-prompt-modal");
  const input = document.getElementById("cohuong-modal-input");
  if (modal && input) {
    input.value = ""; // Làm sạch ô nhập liệu mỗi khi mở
    modal.classList.remove("hidden");
    input.focus();
  }
};
// Hàm xử lý gửi dữ liệu từ Modal lên Firebase (Giữ nguyên cấu trúc logic gốc)
window.submitCohuongModalAnnouncement = async function () {
  const input = document.getElementById("cohuong-modal-input");
  const modal = document.getElementById("cohuong-prompt-modal");

  if (!input || !input.value.trim()) {
    alert("Vui lòng nhập nội dung trước khi phát!");
    return;
  }
  if (!window.db || !window.FB_FIRESTORE) {
    window.showCustomNotice?.(
      "Không thể kết nối dịch vụ thông báo. Vui lòng thử lại sau.",
    );
    return;
  }
  try {
    // Ẩn nhanh giao diện modal tạo cảm giác mượt mà
    if (modal) modal.classList.add("hidden");
    // Giữ nguyên luồng kết nối và đẩy dữ liệu lên Firestore như cũ
    await window.FB_FIRESTORE.addDoc(
      window.FB_FIRESTORE.collection(window.db, "cohuongAnnouncements"),
      {
        author: "Cô Hường",
        message: input.value.trim(),
        createdAt: Date.now(),
      },
    );
    window.showCustomNotice?.("📣 Thông báo đã được phát đến toàn web.");
  } catch (err) {
    console.error(err);
    window.showCustomNotice?.("❌ Không thể phát thông báo. Vui lòng thử lại.");
  }
};

window.renderCohuongAnnouncementBanner = function (announcement) {
  let banner = document.getElementById("cohuong-announcement-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "cohuong-announcement-banner";
    banner.className =
      "fixed top-24 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[90%] min-h-[48px] bg-amber-500/95 border border-amber-300 text-neutral-900 rounded-3xl shadow-premium px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold transition-all";
    document.body.appendChild(banner);
  }
  if (!announcement) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
    return;
  }
  const timeText = new Date(announcement.createdAt).toLocaleTimeString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
  banner.innerHTML = `<div class="flex-1 min-w-0">
      <p class="truncate"><strong>📢 Thông báo từ Cô Hường</strong>: ${announcement.message}</p>
      <p class="text-[10px] text-neutral-700 mt-0.5">${timeText}</p>
    </div>
    <button type="button" onclick="document.getElementById('cohuong-announcement-banner')?.classList.add('hidden')" class="text-neutral-900 bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold">Đã xem</button>`;
  banner.classList.remove("hidden");
};

// window.renderCohuongAnnouncementBanner = function (announcement) {
//   const dynamicZone = document.getElementById("cohuong-dynamic-zone");
//   const textEl = document.getElementById("cohuong-zone-text");
//   const timeEl = document.getElementById("cohuong-zone-time");

//   // Nếu không tìm thấy các thẻ chứa trong HTML, không xử lý tiếp để tránh crash web
//   if (!dynamicZone || !textEl || !timeEl) return;

//   // Nếu không có thông báo nào từ Firebase, ẩn toàn bộ khu vực này đi
//   if (!announcement || !announcement.message) {
//     dynamicZone.classList.add("hidden");
//     return;
//   }

//   // Chuyển đổi thời gian đăng sang định dạng giờ Việt Nam thân thiện
//   const timeText = new Date(announcement.createdAt).toLocaleTimeString(
//     "vi-VN",
//     {
//       hour: "2-digit",
//       minute: "2-digit",
//       day: "2-digit",
//       month: "2-digit",
//     },
//   );

//   // Bơm dữ liệu động vào khung trang trí sẵn
//   textEl.innerText = announcement.message;
//   timeEl.innerText = `⏱ Đăng lúc: ${timeText}`;

//   // Loại bỏ class 'hidden' để hiển thị khung rực rỡ lên giao diện chính
//   dynamicZone.classList.remove("hidden");
// };

// ==========================================
// ĐỒNG BỘ REALTIME TỪ FIREBASE ĐÁM MÂY
// ==========================================
function initFirestoreRealtime() {
  if (window.__firestoreRealtimeInitialized) return;
  window.__firestoreRealtimeInitialized = true;

  waitForFirebaseReady()
    .then(() => {
      const { collection, onSnapshot, query, orderBy } = window.FB_FIRESTORE;

      // Realtime bài viết kỷ niệm
      const memoriesRef = collection(window.db, "memories");
      const memoriesQuery = query(memoriesRef, orderBy("timestamp", "desc"));
      onSnapshot(memoriesQuery, (snap) => {
        window.allMemories = [];
        snap.forEach((d) => window.allMemories.push({ id: d.id, ...d.data() }));
        renderMemoryFeed();
      });

      // Realtime hòm thư tươnng lai
      const capsulesRef = collection(window.db, "capsules");
      const capsulesQuery = query(capsulesRef, orderBy("timestamp", "desc"));
      onSnapshot(capsulesQuery, (snap) => {
        const list = document.getElementById("capsules-list");
        if (!list) return;
        list.innerHTML = "";
        snap.forEach((d) => {
          const item = d.data();
          const card = document.createElement("div");
          card.className =
            "rounded-3xl border border-brand-200/70 bg-white p-5 shadow-sm";
          card.innerHTML = `<h4 class="font-bold text-brand-900">${item.author || "Ẩn danh"}</h4><p class="text-sm text-neutral-600 mt-1">${item.message || ""}</p>`;
          list.appendChild(card);
        });
      });

      // Realtime check các ô số đã bị chiếm đóng
      const slotsRef = collection(window.db, "slots");
      onSnapshot(query(slotsRef, orderBy("timestamp", "asc")), (snapshot) => {
        const slotOptions = document.querySelectorAll("[id^=slot-opt-]");
        slotOptions.forEach((opt) => {
          opt.disabled = false;
          opt.innerText = opt.innerText.replace(/\s*\(❌ Đã nhận\)$/, "");
        });

        const now = Date.now();
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data() || {};
          const lastSeen = parseInt(docData.timestamp, 10) || 0;
          if (now - lastSeen > SLOT_PRESENCE_TTL_MS) return;
          const takenSlot =
            parseInt(docData.slotIndex, 10) || parseInt(docSnap.id, 10);
          if (!takenSlot || takenSlot === chosenSlotNumber) return;
          const opt = document.getElementById(`slot-opt-${takenSlot}`);
          if (!opt) return;
          const baseText = opt.innerText.replace(/\s*\(❌ Đã nhận\)$/, "");
          opt.innerText = `${baseText} (❌ Đã nhận)`;
          opt.disabled = true;
        });
      });

      // Realtime thành viên lớp
      const membersCollectionName = "members";
      const altMembersCollectionName = "member";
      const membersRef = collection(window.db, membersCollectionName);
      const membersQuery = query(membersRef, orderBy("name", "asc"));
      onSnapshot(
        membersQuery,
        (snap) => {
          window.allMembers = [];
          SLOT_ACCOUNTS = {};
          const buildFromDoc = (docSnap) => {
            const data = docSnap.data() || {};
            const idMatch = String(docSnap.id).match(/member-(\d+)$/i);
            const slotIndex = idMatch
              ? parseInt(idMatch[1], 10)
              : parseInt(data.slotIndex, 10);
            if (slotIndex && slotIndex >= START_SLOT && slotIndex <= END_SLOT) {
              SLOT_ACCOUNTS[slotIndex] = {
                id: docSnap.id,
                name: data.name || `Thành viên số ${slotIndex}`,
                emoji: data.emoji || "",
                role: data.role || "Thành viên Lớp",
                ...data,
              };
            }
            window.allMembers.push({ id: docSnap.id, ...data });
          };

          if (snap.empty) {
            const altMembersRef = collection(
              window.db,
              altMembersCollectionName,
            );
            const altMembersQuery = query(
              altMembersRef,
              orderBy("name", "asc"),
            );
            onSnapshot(altMembersQuery, (altSnap) => {
              window.allMembers = [];
              SLOT_ACCOUNTS = {};
              altSnap.forEach((docSnap) => buildFromDoc(docSnap));
              refreshSlotOptions();
              window.renderMembers?.();
            });
            return;
          }
          snap.forEach((docSnap) => buildFromDoc(docSnap));
          refreshSlotOptions();
          window.renderMembers?.();
        },
        (error) => {
          console.error(
            "Firebase trả về lỗi đối với bảng members rồi bạn ơi:",
            error,
          );
        },
      );
      // Realtime announcements from Cô Hường
      const announcementsRef = collection(window.db, "cohuongAnnouncements");
      const announcementsQuery = query(
        announcementsRef,
        orderBy("createdAt", "desc"),
      );
      onSnapshot(announcementsQuery, (snapshot) => {
        let latest = null;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!latest || (data.createdAt || 0) > (latest.createdAt || 0)) {
            latest = { id: docSnap.id, ...data };
          }
        });
        window.renderCohuongAnnouncementBanner(latest);
      });
    })
    .catch((err) => {
      console.warn("Firebase realtime init warning:", err);
    });
}

function renderMemoryFeed() {
  const feed = document.getElementById("memories-feed");
  if (!feed || !window.allMemories) return;
  feed.innerHTML = "";
  window.allMemories.forEach((item) => {
    const art = document.createElement("article");
    art.className =
      "bg-white border border-brand-200/60 rounded-3xl p-6 shadow-sm mb-4";
    art.innerHTML = `<h4 class="font-bold text-brand-900 text-lg">${item.author || "Ẩn danh"}</h4><p class="text-sm text-neutral-600 mt-2">${item.text || ""}</p>`;
    feed.appendChild(art);
  });
}

window.renderMembers = function () {
  const grid = document.getElementById("students-grid");
  const countEl = document.getElementById("cnt-members");
  if (!grid) return;

  // Xóa bỏ trạng thái cũ để load lại dữ liệu mới
  grid.innerHTML = "";

  let totalClaimed = 0;

  // Duyệt qua toàn bộ 52 số định danh lớp học
  for (let i = 1; i <= 52; i++) {
    // Lấy thông tin tài khoản từ dữ liệu cấu hình Firebase (SLOT_ACCOUNTS)
    const account = window.SLOT_ACCOUNTS ? window.SLOT_ACCOUNTS[i] : null;

    // Tạo phần tử hiển thị cho từng vị trí số thứ tự
    const card = document.createElement("div");
    card.className =
      "bg-white border border-brand-200/60 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-all relative group";

    // Nếu số này đã có người điền tên
    if (account && account.name) {
      totalClaimed++;
      card.innerHTML = `
        <div class="absolute top-2 left-2 w-5 h-5 bg-brand-700 text-white rounded-full flex items-center justify-center font-mono text-[10px] font-bold">
          ${i}
        </div>
        <div class="pt-2">
          <h4 class="font-bold text-neutral-800 text-sm">${i}. ${account.name}</h4>
          <p class="text-[11px] text-emerald-600 font-medium mt-1">
            <i class="fa-solid fa-circle-check mr-1"></i>Đã nhận
          </p>
        </div>
      `;
    } else {
      // Nếu số này còn trống, chưa có ai điền
      card.innerHTML = `
        <div class="absolute top-2 left-2 w-5 h-5 bg-neutral-200 text-neutral-500 rounded-full flex items-center justify-center font-mono text-[10px]">
          ${i}
        </div>
        <div class="pt-2 text-neutral-400">
          <h4 class="text-sm font-medium">${i}. Trống</h4>
          <p class="text-[10px] mt-1 italic">Chưa đăng ký</p>
        </div>
      `;
    }

    grid.appendChild(card);
  }

  // Cập nhật lại số lượng thành viên đã đăng ký lên giao diện
  if (countEl) countEl.innerText = String(totalClaimed);
};
// Enable dragging and resizing for the member slots widget (pointer-friendly)
function initWidgetDragResize() {
  try {
    const widget = document.getElementById("member-slots-widget");
    if (!widget || widget.__dragResizeInitialized) return;
    widget.__dragResizeInitialized = true;

    // Ensure widget is positioned for left/top control
    widget.style.position = widget.style.position || "fixed";
    widget.style.touchAction = "none";
    widget.style.userSelect = "none";
    // Make the widget smaller by default for compact UI
    widget.style.minWidth = widget.style.minWidth || "110px";
    widget.style.width = widget.style.width || "130px";
    widget.style.maxWidth = widget.style.maxWidth || "50vw";

    // Create resizer handle
    const resizer = document.createElement("div");
    resizer.id = "widget-resizer";
    resizer.style.width = "12px";
    resizer.style.height = "12px";
    resizer.style.position = "absolute";
    resizer.style.right = "6px";
    resizer.style.bottom = "6px";
    resizer.style.cursor = "se-resize";
    resizer.style.borderRadius = "4px";
    resizer.style.background = "rgba(0,0,0,0.06)";
    resizer.style.zIndex = "9999";
    resizer.style.touchAction = "none";
    widget.appendChild(resizer);

    // Make header draggable (use first header-like bar)
    const header = widget.querySelector(".flex.items-center") || widget;
    header.style.cursor = "move";

    let dragState = null;

    function onPointerDownDrag(e) {
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      const rect = widget.getBoundingClientRect();
      // switch to left/top positioning
      if (widget.style.right && !widget.style.left) {
        widget.style.left = rect.left + "px";
        widget.style.top = rect.top + "px";
        widget.style.right = "auto";
      }
      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        startLeft: parseFloat(widget.style.left || rect.left),
        startTop: parseFloat(widget.style.top || rect.top),
      };
      document.addEventListener("pointermove", onPointerMoveDrag);
      document.addEventListener("pointerup", onPointerUpDrag, { once: true });
    }

    function onPointerMoveDrag(e) {
      if (!dragState) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      widget.style.left = Math.max(8, dragState.startLeft + dx) + "px";
      widget.style.top = Math.max(8, dragState.startTop + dy) + "px";
    }

    function onPointerUpDrag() {
      dragState = null;
      document.removeEventListener("pointermove", onPointerMoveDrag);
    }

    function onPointerDownResize(e) {
      e.preventDefault();
      const rect = widget.getBoundingClientRect();
      const start = {
        x: e.clientX,
        y: e.clientY,
        w: rect.width,
        h: rect.height,
      };
      function move(ev) {
        const dx = ev.clientX - start.x;
        const dy = ev.clientY - start.y;
        widget.style.width = Math.max(120, start.w + dx) + "px";
        widget.style.height = Math.max(80, start.h + dy) + "px";
      }
      function up() {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    }

    header.addEventListener("pointerdown", onPointerDownDrag);
    resizer.addEventListener("pointerdown", onPointerDownResize);
  } catch (err) {
    console.warn("initWidgetDragResize error:", err);
  }
}

// ==========================================
// KHỞI CHẠY ĐỒNG BỘ ỔN ĐỊNH
// ==========================================
enforceFeatureLockUI();

window.addEventListener("slotsComponentReady", async () => {
  updateWidgetProfileUI();
  initWidgetDragResize();
  initFirestoreRealtime();
  if (chosenSlotNumber) await activateSlotPresence();
});

if (document.getElementById("slots-dropdown-container")) {
  updateWidgetProfileUI();
  initWidgetDragResize();
  initFirestoreRealtime();
  if (chosenSlotNumber) activateSlotPresence();
}

window.addEventListener("firebaseInitialized", () => {
  initFirestoreRealtime();
  if (chosenSlotNumber) activateSlotPresence();
  if (window.auth && window.FB_AUTH) {
    window.FB_AUTH.onAuthStateChanged(window.auth, (user) => {
      window.syncAdminAccessFromAuth(user);
    });
  }
});

if (window.db && window.FB_FIRESTORE) {
  initFirestoreRealtime();
  if (chosenSlotNumber) activateSlotPresence();
}
if (window.auth && window.FB_AUTH) {
  window.FB_AUTH.onAuthStateChanged(window.auth, (user) => {
    window.syncAdminAccessFromAuth(user);
  });
}

window.addEventListener("beforeunload", async () => {
  await releaseSlotPresence();
});
