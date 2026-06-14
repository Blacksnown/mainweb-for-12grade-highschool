// Cấu hình trạng thái định danh cục bộ
const TOTAL_SLOTS = 52;
let cachedSlotsData = null;

// Kiểm tra xem trình duyệt này trước đó đã click chọn số nào chưa
let chosenSlotNumber = localStorage.getItem("user_claimed_slot");

// CHỜ GIAO DIỆN HTML LOAD XONG THÌ KHỞI TẠO
window.addEventListener("slotsComponentReady", () => {
  if (chosenSlotNumber !== null) {
    chosenSlotNumber = parseInt(chosenSlotNumber);
  }

  initSlotsWidgetDOM();

  // Nếu dữ liệu từ Firebase đổ về trước hoặc sau khi load giao diện
  if (cachedSlotsData) {
    window.updateSlotsUI(cachedSlotsData);
  } else {
    lockFormsForViewerOnly(); // Mặc định chưa có số định danh thì khóa form
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setupFormActions();
});

// Bước 1: Khởi tạo danh sách 52 ô số nguyên bản ban đầu (0 -> 51)
function initSlotsWidgetDOM() {
  const container = document.getElementById("slots-container");
  if (!container) return;

  container.innerHTML = "";
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const btn = document.createElement("button");
    btn.id = `slot-btn-${i}`;
    btn.innerText = i; // Hiển thị số nguyên bản
    btn.className =
      "slot-item-btn bg-brand-100 hover:bg-brand-200 text-brand-900 font-bold text-xs py-1.5 px-1 rounded-lg border border-brand-200/40 transition-all text-center truncate shadow-sm";

    // SỰ KIỆN CLICK: Lưu số -> Tải lại trang (F5) ngay lập tức
    btn.onclick = () => {
      if (localStorage.getItem("user_claimed_slot") !== null) {
        alert("Bạn đã xác nhận số định danh trên thiết bị này rồi!");
        return;
      }
      if (
        confirm(
          `Xác nhận bạn là thành viên số ${i}? Trang web sẽ tự động tải lại để nhận diện.`,
        )
      ) {
        localStorage.setItem("user_claimed_slot", i);
        location.reload(); // TẢI LẠI TRANG
      }
    };
    container.appendChild(btn);
  }
}

// Bước 2: Đồng bộ dữ liệu Admin nhập sẵn trên Firebase -> Chuyển đổi Số thành Tên sau khi load trang
window.updateSlotsUI = function (slotsData) {
  cachedSlotsData = slotsData;
  const container = document.getElementById("slots-container");
  if (!container) return;

  // Tìm tên của số mà thiết bị này đã chọn (đọc từ Database)
  let currentMemberName = slotsData[chosenSlotNumber];

  if (chosenSlotNumber !== null && currentMemberName) {
    // 1. Đổi trạng thái Badge thông báo ở góc trên widget
    const badge = document.getElementById("current-slot-badge");
    if (badge) {
      badge.innerText = `Số ${chosenSlotNumber}: ${currentMemberName}`;
      badge.className =
        "text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md";
    }

    // 2. Tự động điền họ tên lấy từ Database vào các ô Author trng form
    if (document.getElementById("memory-author"))
      document.getElementById("memory-author").value = currentMemberName;
    if (document.getElementById("capsule-author"))
      document.getElementById("capsule-author").value = currentMemberName;

    // 3. MỞ KHÓA TOÀN BỘ QUYỀN VIẾT BÀI
    unlockFormsForMembers();
  } else {
    lockFormsForViewerOnly();
  }

  // Quét qua 52 ô số để xử lý giao diện hiển thị biến đổi Số -> Tên
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const btn = document.getElementById(`slot-btn-${i}`);
    if (!btn) continue;

    if (slotsData[i]) {
      // Nếu là số ĐÚNG của thiết bị này đã chọn -> Biến đổi thành Tên hiển thị rực rỡ
      if (chosenSlotNumber === i) {
        btn.innerText = slotsData[i];
        btn.className =
          "slot-item-btn col-span-2 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[11px] py-1.5 px-2 rounded-lg text-left truncate shadow-md animate-fade-in pointer-events-none";
      } else {
        // Đối với các ô số của thành viên khác đã có tên trên DB, chuyển thành dạng ẩn/khóa
        btn.innerText = `Số ${i} (Đã nhận)`;
        btn.className =
          "slot-item-btn col-span-2 bg-neutral-100 text-neutral-400 border border-neutral-200 text-[10px] py-1.5 px-1 rounded-lg text-center truncate pointer-events-none";
      }
    }
  }
};

// --- HỆ THỐNG KHÓA VÀ MỞ BIỂU MẪU ĐIỀN THÔNG TIN ---
function lockFormsForViewerOnly() {
  const memoryForm = document.getElementById("memory-form");
  if (memoryForm) {
    toggleFormInputsState(memoryForm, true);
    attachLockOverlay(
      memoryForm,
      "Vui lòng chọn Số thứ tự của bạn ở góc màn hình để mở khóa quyền điền dữ liệu.",
    );
  }
  const capsuleForm = document.getElementById("capsule-form");
  if (capsuleForm) {
    toggleFormInputsState(capsuleForm, true);
    attachLockOverlay(
      capsuleForm,
      "Vui lòng chọn Số thứ tự của bạn ở góc màn hình để mở khóa quyền điền dữ liệu.",
    );
  }
}

function unlockFormsForMembers() {
  const memoryForm = document.getElementById("memory-form");
  if (memoryForm) {
    toggleFormInputsState(memoryForm, false);
    clearLockOverlay(memoryForm);
  }
  const capsuleForm = document.getElementById("capsule-form");
  if (capsuleForm) {
    toggleFormInputsState(capsuleForm, false);
    clearLockOverlay(capsuleForm);
  }
}

function toggleFormInputsState(formElement, isDisable) {
  const inputs = formElement.querySelectorAll(
    "input, textarea, select, button",
  );
  inputs.forEach((el) => {
    el.disabled = isDisable;
    if (isDisable) el.classList.add("opacity-50", "cursor-not-allowed");
    else el.classList.remove("opacity-50", "cursor-not-allowed");
  });
}

function attachLockOverlay(formElement, textMessage) {
  clearLockOverlay(formElement);
  formElement.classList.add("relative");
  const overlay = document.createElement("div");
  overlay.className =
    "custom-form-lock-overlay absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center text-center p-4 rounded-2xl z-10 select-none";
  overlay.innerHTML = `
    <div class="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl max-w-xs shadow-sm">
      <i class="fa-solid fa-lock text-base text-amber-600 mb-1"></i>
      <p class="text-[11px] font-semibold">${textMessage}</p>
    </div>
  `;
  formElement.appendChild(overlay);
}

function clearLockOverlay(formElement) {
  const existingOverlays = formElement.querySelectorAll(
    ".custom-form-lock-overlay",
  );
  existingOverlays.forEach((overlay) => overlay.remove());
}

function setupFormActions() {
  const memBtn = document.getElementById("submit-memory-btn");
  if (memBtn) {
    memBtn.onclick = async () => {
      const author = document.getElementById("memory-author").value.trim();
      const tag = document.getElementById("memory-tag").value.trim();
      const content = document.getElementById("memory-content").value.trim();
      if (!author || !content)
        return alert("Vui lòng điền đủ tên và nội dung kỷ niệm.");
      try {
        if (window._firebaseHelpers) {
          await window._firebaseHelpers.addDocTo("memories", {
            author,
            tag,
            content,
            timestamp: Date.now(),
          });
          document.getElementById("memory-content").value = "";
          alert("Đã gửi kỷ niệm thành công!");
        }
      } catch (err) {
        alert("Lỗi khi gửi: " + err.message);
      }
    };
  }

  const capBtn = document.getElementById("submit-capsule-btn");
  if (capBtn) {
    capBtn.onclick = async () => {
      const author = document.getElementById("capsule-author").value.trim();
      const email = document.getElementById("capsule-email").value.trim();
      const content = document.getElementById("capsule-content").value.trim();
      if (!author || !content)
        return alert("Vui lòng nhập tên người gửi và nội dung thư.");
      try {
        if (window._firebaseHelpers) {
          await window._firebaseHelpers.addDocTo("capsules", {
            author,
            email,
            content,
            timestamp: Date.now(),
          });
          document.getElementById("capsule-content").value = "";
          alert("Đã niêm phong thư tương lai thành công!");
        }
      } catch (err) {
        alert("Lỗi: " + err.message);
      }
    };
  }
}

export function initAuthShim() {}
export function bindAuthEvents() {}
