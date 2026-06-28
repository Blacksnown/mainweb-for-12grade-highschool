const START_SLOT = 1;
const END_SLOT = 52;
const SPECIAL_NOTIFY_SLOT = 52;
let SLOT_ACCOUNTS = {}
let chosenSlotNumber = localStorage.getItem("user_claimed_slot");
if (chosenSlotNumber !== null) {
  chosenSlotNumber = parseInt(chosenSlotNumber, 10);
}
let temporarySelectedSlot = null;
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
      if (roleBadge) roleBadge.innerText = "💬 Thông báo toàn web";
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
    localStorage.setItem("user_claimed_slot", chosenSlotNumber);
    updateWidgetProfileUI();
    window.location.reload(); // Refresh đồng bộ dữ liệu sạch
  } else {
    const selectElement = document.getElementById("slots-dropdown-container");
    if (selectElement) selectElement.value = "";
    temporarySelectedSlot = null;
    document
      .getElementById("widget-access-submit-btn")
      ?.classList.add("hidden");
  }
};

window.handleLogoutSlot = function () {
  if (confirm("Bạn có chắc chắn muốn thoát quyền định danh hiện tại không?")) {
    localStorage.removeItem("user_claimed_slot");
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
  const text = prompt("Nhập nội dung thông báo toàn web:");
  if (!text || text.trim().length === 0) {
    return;
  }
  if (!window.db || !window.FB_FIRESTORE) {
    window.showCustomNotice?.(
      "Không thể kết nối dịch vụ thông báo. Vui lòng thử lại sau.",
    );
    return;
  }
  try {
    await window.FB_FIRESTORE.addDoc(
      window.FB_FIRESTORE.collection(window.db, "cohuongAnnouncements"),
      {
        author: "Cô Hường",
        message: text.trim(),
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

      // Realtime hòm thư viên nang
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
        snapshot.forEach((docSnap) => {
          const takenSlot = parseInt(docSnap.data().slotIndex, 10);
          if (takenSlot && takenSlot !== chosenSlotNumber) {
            const opt = document.getElementById(`slot-opt-${takenSlot}`);
            if (opt) {
              if (!opt.innerText.includes(" (❌ Đã nhận)")) {
                opt.innerText += " (❌ Đã nhận)";
              }
              opt.disabled = true;
            }
          }
        });
      });

      // Realtime thành viên lớp
      const membersCollectionName = "members";
      const altMembersCollectionName = "member";
      const membersRef = collection(window.db, membersCollectionName);
      const membersQuery = query(membersRef, orderBy("name", "asc"));
      onSnapshot(membersQuery, (snap) => {
        window.allMembers = [];
        if (snap.empty) {
          const altMembersRef = collection(window.db, altMembersCollectionName);
          const altMembersQuery = query(altMembersRef, orderBy("name", "asc"));
          onSnapshot(altMembersQuery, (altSnap) => {
            window.allMembers = [];
            altSnap.forEach((docSnap) => {
              window.allMembers.push({ id: docSnap.id, ...docSnap.data() });
            });
            window.renderMembers?.();
          });
          return;
        }
        snap.forEach((docSnap) => {
          window.allMembers.push({ id: docSnap.id, ...docSnap.data() });
        });
        window.renderMembers?.();
      });

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

function renderMembers() {
  const grid = document.getElementById("students-grid");
  const countEl = document.getElementById("cnt-members");
  if (!grid) return;

  const members = (window.allMembers || []).slice();
  if (countEl) countEl.innerText = String(members.length);

  if (members.length === 0) {
    grid.innerHTML = `<div class="col-span-full rounded-3xl border border-dashed border-brand-200 bg-brand-50/70 py-10 text-center text-xs text-neutral-500">
        <i class="fa-solid fa-users-slash text-brand-400 text-3xl mb-2"></i>
        Danh sách thành viên sẽ xuất hiện khi Firestore có dữ liệu.
      </div>`;
    return;
  }

  grid.innerHTML = "";
  members.forEach((member) => {
    const card = document.createElement("div");
    card.className =
      "rounded-3xl border border-brand-200/70 bg-white p-4 shadow-sm space-y-3";
    const avatar = (member.emoji || "👋").trim();
    const avatarHtml = /^https?:\/\//i.test(avatar)
      ? `<img src="${avatar}" alt="avatar" class="w-12 h-12 rounded-2xl object-cover border border-brand-200/70 shadow-sm" />`
      : `<div class="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-200/70 flex items-center justify-center text-xl shadow-sm">${avatar}</div>`;

    card.innerHTML = `
      <div class="flex items-start gap-3">
        ${avatarHtml}
        <div class="min-w-0 flex-1">
          <h4 class="font-serif text-base font-bold text-brand-900 truncate">${member.name || "Thành viên"}</h4>
          <p class="text-[11px] text-brand-700 font-semibold">${member.nickname || "Thành viên lớp"}</p>
          <p class="text-[10px] text-neutral-500 mt-1 line-clamp-3">${member.quote || "Châm ngôn chưa có."}</p>
        </div>
      </div>`;

    grid.appendChild(card);
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

window.addEventListener("firebaseInitialized", () => {
  initFirestoreRealtime();
  if (window.auth && window.FB_AUTH) {
    window.FB_AUTH.onAuthStateChanged(window.auth, (user) => {
      window.syncAdminAccessFromAuth(user);
    });
  }
});

if (window.db && window.FB_FIRESTORE) {
  initFirestoreRealtime();
}
if (window.auth && window.FB_AUTH) {
  window.FB_AUTH.onAuthStateChanged(window.auth, (user) => {
    window.syncAdminAccessFromAuth(user);
  });
}
