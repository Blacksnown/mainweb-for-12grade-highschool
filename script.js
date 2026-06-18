// HỆ THỐNG SỐ ĐỊNH DANH (1 ĐẾN 52)
const START_SLOT = 1;
const END_SLOT = 52;
const SPECIAL_ADMIN_SLOT = 52;

// Danh sách tài khoản định danh đặc biệt theo yêu cầu
const SLOT_ACCOUNTS = {
  1: { name: "Chu Thị Quỳnh Anh", role: "Thành viên " },
  2: { name: "Nguyễn Thị Quỳnh Anh", role: "Thành viên " },
  3: { name: "Lê Đức Anh", role: "Thành viên " },
  4: { name: "Lê Văn Anh", role: "Thành viên " },
};

let chosenSlotNumber = localStorage.getItem("user_claimed_slot");
if (chosenSlotNumber !== null) {
  chosenSlotNumber = parseInt(chosenSlotNumber, 10);
}

window.currentMemoryFilter = "all";

// Hàm chặn và yêu cầu người dùng chọn số định danh trước khi sử dụng tính năng ẩn
function checkAuth() {
  if (!chosenSlotNumber) {
    window.showCustomNotice?.(
      "⚠️ Bạn cần chọn một số định danh để mở khóa tính năng này!",
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
        reject(new Error("Firebase không sẵn sàng sau 7 giây."));
      }
    }, 150);
  });
}

// Hàm cập nhật hiển thị tài khoản ở góc phải sau khi chọn số
function updateWidgetProfileUI() {
  const selectionState = document.getElementById("widget-selection-state");
  const profileState = document.getElementById("widget-profile-state");
  const avatarNum = document.getElementById("profile-avatar-num");
  const profileCard = document.getElementById("profile-card-layout");

  if (!selectionState || !profileState) return;

  if (chosenSlotNumber) {
    selectionState.classList.add("hidden");
    profileState.classList.remove("hidden");
    if (avatarNum) avatarNum.innerText = chosenSlotNumber;

    if (profileCard) {
      // Lấy thông tin tài khoản tương ứng với số định danh
      const account = SLOT_ACCOUNTS[chosenSlotNumber] || {
        name: `Thành viên số ${chosenSlotNumber}`,
        role: "Thành viên",
      };
      profileCard.querySelector("h4").innerText = account.name;
      const roleBadge = document.getElementById("profile-role-badge");
      if (roleBadge) roleBadge.innerText = account.role;
    }
  } else {
    selectionState.classList.remove("hidden");
    profileState.classList.add("hidden");
  }
}

// Xử lý khi click chọn số trên dropdown widget
window.handleSelectSlot = async function (value) {
  if (!value) return;
  const slotNum = parseInt(value, 10);

  // Lưu số định danh vào máy người dùng
  localStorage.setItem("user_claimed_slot", slotNum);
  chosenSlotNumber = slotNum;

  // Hiển thị giao diện tên tài khoản mới ở góc phải ngay lập tức
  updateWidgetProfileUI();

  window.showCustomNotice?.(
    `🎉 Đăng nhập thành công tài khoản định danh số ${slotNum}! Các tính năng đã được mở khóa.`,
  );

  // Đồng bộ trạng thái lên Firebase slots để giữ chỗ (nếu cần)
  try {
    const { collection, addDoc } = window.FB_FIRESTORE;
    const slotsRef = collection(window.db, "slots");
    await addDoc(slotsRef, {
      slotIndex: slotNum,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.error("Lỗi đồng bộ slot:", e);
  }
};

function initFirestoreRealtime() {
  waitForFirebaseReady()
    .then(() => {
      const { collection, onSnapshot, query, orderBy } = window.FB_FIRESTORE;

      const memoriesRef = collection(window.db, "memories");
      const memoriesQuery = query(memoriesRef, orderBy("timestamp", "desc"));
      onSnapshot(memoriesQuery, renderMemorySnapshot, (error) =>
        console.error("-> [Firebase] Lỗi realtime memories:", error),
      );

      const capsulesRef = collection(window.db, "capsules");
      const capsulesQuery = query(capsulesRef, orderBy("timestamp", "desc"));
      onSnapshot(capsulesQuery, renderCapsuleSnapshot, (error) =>
        console.error("-> [Firebase] Lỗi realtime capsules:", error),
      );

      const signaturesRef = collection(window.db, "signatures");
      const signaturesQuery = query(
        signaturesRef,
        orderBy("timestamp", "desc"),
      );
      onSnapshot(
        signaturesQuery,
        (snap) => {
          // Render signatures wall...
        },
        (error) =>
          console.error("-> [Firebase] Lỗi realtime signatures:", error),
      );

      const slotsRef = collection(window.db, "slots");
      const slotsQuery = query(slotsRef, orderBy("timestamp", "asc"));
      onSnapshot(slotsQuery, (snapshot) => {
        const selectElement = document.getElementById(
          "slots-dropdown-container",
        );
        if (!selectElement) return;

        // Reset options danh sách chọn số
        selectElement.innerHTML =
          '<option value="">-- Chọn số định danh của bạn --</option>';
        for (let i = START_SLOT; i <= END_SLOT; i++) {
          const opt = document.createElement("option");
          opt.id = `slot-opt-${i}`;
          opt.value = i;
          opt.innerText =
            i === SPECIAL_ADMIN_SLOT
              ? `Số ${i} - 👑 Giáo Viên Chủ Nhiệm`
              : `Số định danh thứ: ${i}`;
          selectElement.appendChild(opt);
        }

        // Đánh dấu các số đã có người chọn trước đó
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const takenSlot = parseInt(data.slotIndex, 10);
          if (takenSlot && takenSlot !== chosenSlotNumber) {
            const opt = document.getElementById(`slot-opt-${takenSlot}`);
            if (opt) {
              opt.innerText += " (❌ Đã có người nhận)";
              opt.disabled = true;
            }
          }
        });
      });
    })
    .catch((error) => {
      console.warn(
        "-> [Firebase] initFirestoreRealtime chưa khởi tạo được:",
        error,
      );
    });
}

function renderMemorySnapshot(snapshot) {
  window.allMemories = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data) return;
    window.allMemories.push({ id: docSnap.id, ...data });
  });
  renderMemoryFeed();
}

function renderMemoryFeed() {
  const feed = document.getElementById("memories-feed");
  const countBadge = document.getElementById("memories-count");
  if (!feed) return; // Bảo vệ lỗi DOM trống

  const visible = window.allMemories.filter((item) => {
    if (window.currentMemoryFilter === "all") return true;
    return String(item.period || "").startsWith(window.currentMemoryFilter);
  });

  if (countBadge) {
    countBadge.innerText = `${window.allMemories.length} kỷ niệm`;
  }

  if (visible.length === 0) {
    feed.innerHTML = `
      <div class="text-center py-12 text-neutral-400">
        <p class="text-xs">Chưa có kỷ niệm phù hợp để hiển thị.</p>
      </div>
    `;
    return;
  }

  feed.innerHTML = "";
  visible.forEach((item) => {
    const article = document.createElement("article");
    article.className =
      "bg-white border border-brand-200/60 rounded-3xl p-6 shadow-sm animate-fade-in";
    article.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-4">
        <div>
          <p class="text-[11px] uppercase tracking-[0.25em] text-brand-500 font-bold">${item.period || "Kỷ Niệm"}</p>
          <h4 class="font-bold text-brand-900 text-lg mt-2">${item.author || "Thành viên ẩn danh"}</h4>
        </div>
        <span class="text-[10px] text-neutral-400 uppercase tracking-[0.22em]">${new Date(item.timestamp || Date.now()).toLocaleDateString("vi-VN")}</span>
      </div>
      <p class="text-sm leading-relaxed text-neutral-600 whitespace-pre-line">${item.text || "(Nội dung chưa có)"}</p>
      <div class="mt-4 text-sm text-brand-700">${item.emoji ? `Cảm xúc: ${item.emoji}` : ""}</div>
    `;
    feed.appendChild(article);
  });
}

window.filterMemories = function (period) {
  window.currentMemoryFilter = period;
  renderMemoryFeed();
};

window.submitMemory = async function (event) {
  event.preventDefault();
  if (!checkAuth()) return; // Kiểm tra phân quyền kích hoạt tính năng

  const author = document.getElementById("memory-author")?.value.trim();
  const period = document.getElementById("memory-period")?.value;
  const text = document.getElementById("memory-text")?.value.trim();
  const emoji = document.getElementById("memory-emoji")?.value.trim();

  if (!author || !text || !period) {
    alert("Vui lòng điền đầy đủ thông tin.");
    return;
  }

  try {
    await waitForFirebaseReady();
    const { collection, addDoc } = window.FB_FIRESTORE;
    const memoriesRef = collection(window.db, "memories");
    await addDoc(memoriesRef, {
      author,
      period,
      text,
      emoji,
      slot: chosenSlotNumber || null,
      timestamp: Date.now(),
    });

    document.getElementById("memory-form")?.reset();
    window.showCustomNotice?.("✅ Kỷ niệm của bạn đã được lưu thành công!");
  } catch (error) {
    console.error(error);
    alert("Lưu thất bại.");
  }
};

function renderCapsuleSnapshot(snapshot) {
  window.allCapsules = [];
  const list = document.getElementById("capsules-list");
  if (!list) return;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data) return;
    window.allCapsules.push({ id: docSnap.id, ...data });
  });

  list.innerHTML = "";
  if (window.allCapsules.length === 0) {
    list.innerHTML = `<div class="col-span-full text-center py-8 text-neutral-400">Hòm thư trống</div>`;
    return;
  }

  window.allCapsules.forEach((item) => {
    const card = document.createElement("div");
    card.className =
      "rounded-3xl border border-brand-200/70 bg-white p-5 shadow-sm animate-fade-in";
    card.innerHTML = `
      <div class="flex items-center justify-between gap-3 mb-3">
        <h4 class="font-bold text-brand-900">${item.author || "Ẩn danh"}</h4>
      </div>
      <p class="text-sm text-neutral-600">${item.message || ""}</p>
    `;
    list.appendChild(card);
  });
}

// Khởi chạy hệ thống sau khi trang web và thành phần component 'member.html' đã sẵn sàng hoàn toàn
window.addEventListener("slotsComponentReady", () => {
  updateWidgetProfileUI();
  initFirestoreRealtime();
});
window.addEventListener("DOMContentLoaded", () => {
  // Dự phòng trường hợp cấu trúc tĩnh chạy trước
  setTimeout(updateWidgetProfileUI, 500);
});
