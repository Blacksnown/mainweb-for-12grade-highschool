/**
 * =========================================================================
 * FILE MỞ RỘNG: ĐẶC QUYỀN TỐI CAO & HỆ THỐNG ĐĂNG NHẬP TRỰC DIỆN (V6)
 * Thay thế nút cấu hình góc trên bằng nút Đăng nhập/Đăng ký & Bỏ ngụy trang Footer
 * =========================================================================
 */

window.AdminExtraFeatures = {
  musicBackground: false,
  confettiEffect: true,
  luckyWheel: true,
};

document.addEventListener("DOMContentLoaded", () => {
  initAdminPrivileges();
  replaceSettingWithAuthButton(); // Thay thế nút bánh răng cài đặt bằng nút Đăng nhập / Đăng ký trực diện
  initMusicPlayer();
  initConfettiEffect();
  initLuckyWheelUI();
});

/**
 * 1. THAY THẾ NÚT CÀI ĐẶT GÓC TRÊN BẰNG NÚT ĐĂNG NHẬP / ĐĂNG KÝ TRỰC DIỆN
 */
function replaceSettingWithAuthButton() {
  // Tìm nút cài đặt (icon fa-gears) dựa trên thuộc tính onclick hoặc title trong file index gốc
  const settingBtn =
    document.querySelector('button[title="Cài đặt hệ thống"]') ||
    document.querySelector('button[onclick="openAdminModal()"]');

  if (settingBtn) {
    // Thay đổi giao diện của nút từ hình bánh răng sang dạng nút bấm có chữ sang trọng, rõ ràng
    settingBtn.className =
      "px-4 py-2 text-xs font-bold text-brand-900 bg-brand-100 hover:bg-brand-200 border border-brand-300 rounded-xl transition-all shadow-sm flex items-center gap-2";
    settingBtn.title = "Đăng nhập hoặc Đăng ký quyền Admin";
    settingBtn.innerHTML = `<i class="fa-solid fa-user-shield text-brand-700"></i> Đăng nhập / Đăng ký`;

    // Ghi đè hành động click để mở Form đăng nhập / đăng ký bí mật thay vì bảng cài đặt cũ
    settingBtn.setAttribute("onclick", "showSecretAuthModal()");
  }
}

function showSecretAuthModal() {
  if (document.getElementById("secret-auth-modal")) return;

  const modal = document.createElement("div");
  modal.id = "secret-auth-modal";
  modal.className =
    "fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in";
  modal.innerHTML = `
    <div class="bg-neutral-900 border border-neutral-800 text-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative text-xs">
      <button onclick="closeSecretAuthModal()" class="absolute top-3 right-3 text-neutral-400 hover:text-white text-base font-bold">&times;</button>
      
      <div class="text-center space-y-1">
        <h3 id="auth-modal-title" class="font-bold text-sm tracking-wider text-neutral-200 uppercase">Hệ thống kiểm định</h3>
        <p class="text-[10px] text-neutral-500">Khu vực đồng bộ mã hóa thiết bị lớp học</p>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block text-neutral-400 mb-1 text-[10px]">Tài khoản (Gmail)</label>
          <input type="email" id="secret-email" placeholder="admin@gmail.com" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2 text-white outline-none focus:border-neutral-500">
        </div>
        <div>
          <label class="block text-neutral-400 mb-1 text-[10px]">Mật khẩu bảo mật</label>
          <input type="password" id="secret-password" placeholder="••••••••" class="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-2 text-white outline-none focus:border-neutral-500">
        </div>
      </div>

      <div class="space-y-2 pt-2">
        <button id="auth-main-btn" onclick="handleSecretAuthAction('login')" class="w-full bg-neutral-100 text-black font-bold py-2 rounded-lg hover:bg-white transition-all">
          ĐĂNG NHẬP
        </button>
        <button id="auth-sub-btn" onclick="switchAuthMode('register')" class="w-full bg-transparent text-neutral-400 py-1 hover:text-neutral-200 transition-all text-[10px]">
          Chưa có tài khoản? Nhấn để Đăng ký tài khoản
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

window.closeSecretAuthModal = function () {
  const modal = document.getElementById("secret-auth-modal");
  if (modal) modal.remove();
};

window.switchAuthMode = function (mode) {
  const title = document.getElementById("auth-modal-title");
  const mainBtn = document.getElementById("auth-main-btn");
  const subBtn = document.getElementById("auth-sub-btn");

  if (mode === "register") {
    title.innerText = "Đăng ký cấp quyền quản trị";
    mainBtn.innerText = "TIẾN HÀNH ĐĂNG KÝ";
    mainBtn.setAttribute("onclick", "handleSecretAuthAction('register')");
    subBtn.innerText = "Đã có tài khoản? Quay lại Đăng nhập";
    subBtn.setAttribute("onclick", "switchAuthMode('login')");
  } else {
    title.innerText = "Hệ thống kiểm định";
    mainBtn.innerText = "ĐĂNG NHẬP ADMIN";
    mainBtn.setAttribute("onclick", "handleSecretAuthAction('login')");
    subBtn.innerText = "Chưa có tài khoản? Nhấn để Đăng ký tài khoản";
    subBtn.setAttribute("onclick", "switchAuthMode('register')");
  }
};

window.handleSecretAuthAction = async function (actionType) {
  const email = document.getElementById("secret-email").value.trim();
  const password = document.getElementById("secret-password").value.trim();

  if (!email || !password) return alert("Vui lòng điền đầy đủ thông tin!");
  if (!window.auth || !window.FB_AUTH)
    return alert("Hệ thống Firebase chưa tải xong!");

  try {
    if (actionType === "login") {
      await window.FB_AUTH.signInWithEmailAndPassword(
        window.auth,
        email,
        password,
      );
      window.isAdminActive = true;
      alert("🎉 Xác minh đặc quyền Admin tối cao thành công!");
    } else {
      if (typeof window.FB_AUTH.createUserWithEmailAndPassword === "function") {
        await window.FB_AUTH.createUserWithEmailAndPassword(
          window.auth,
          email,
          password,
        );
        alert("🎉 Đăng ký tài khoản Admin mới thành công!");
      } else {
        alert(
          "Tính năng đăng ký từ xa bị giới hạn bởi cấu hình Auth. Vui lòng tạo tài khoản trên Firebase Console!",
        );
      }
    }
    closeSecretAuthModal();
    window.dispatchEvent(new Event("adminActivated"));
  } catch (error) {
    alert("Thao tác thất bại: " + error.message);
  }
};

/**
 * 2. MỞ KHÓA HẾT TÍNH NĂNG WEB CHO ADMIN GIỐNG THÀNH VIÊN
 */
function initAdminPrivileges() {
  const applyAdminRights = () => {
    if (window.isAdminActive === true) {
      console.log(
        "⚡ [Quyền Admin]: Đang tiến hành dỡ bỏ mọi rào cản hạn chế tính năng...",
      );

      if (typeof window.enforceFeatureLockUI === "function") {
        window.enforceFeatureLockUI();
      }

      document
        .querySelectorAll(".pointer-events-none, .opacity-50")
        .forEach((el) => {
          el.classList.remove(
            "pointer-events-none",
            "opacity-50",
            "blur-[1px]",
          );
        });

      if (typeof window.updateWidgetProfileUI === "function")
        window.updateWidgetProfileUI();

      if (!document.getElementById("admin-master-panel")) {
        createAdminMasterPanel();
      }
    }
  };

  applyAdminRights();
  window.addEventListener("adminActivated", applyAdminRights);
  window.addEventListener("firebaseInitialized", applyAdminRights);
  window.addEventListener("slotsComponentReady", () =>
    setTimeout(applyAdminRights, 400),
  );
}

/**
 * BẢNG ĐIỀU KHIỂN TỐI CAO ADMIN (CÔNG TẮC GIẢI TRÍ + BAN/CHỈNH SỬA)
 */
function createAdminMasterPanel() {
  const panel = document.createElement("div");
  panel.id = "admin-master-panel";
  panel.className =
    "fixed bottom-4 left-4 z-50 bg-neutral-950/95 border border-red-500 text-white p-4 rounded-xl shadow-2xl text-xs space-y-3 max-w-[260px] max-h-[80vh] overflow-y-auto animate-fade-in";

  panel.innerHTML = `
    <div class="font-bold border-b border-red-500/40 pb-1.5 flex items-center text-red-400 uppercase tracking-wider">
      <i class="fa-solid fa-user-shield mr-1.5 animate-pulse"></i> Admin Control Hub
    </div>
    
    <div class="space-y-1 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
      <div class="font-semibold text-neutral-400 mb-1">🎭 Quản lý tính năng giải trí</div>
      <label class="flex items-center justify-between cursor-pointer py-0.5">
        <span>🎵 Nhạc nền kỷ niệm</span>
        <input type="checkbox" ${window.AdminExtraFeatures.musicBackground ? "checked" : ""} onchange="toggleExtraFeature('musicBackground', this.checked)">
      </label>
      <label class="flex items-center justify-between cursor-pointer py-0.5">
        <span>🎉 Pháo giấy rơi</span>
        <input type="checkbox" ${window.AdminExtraFeatures.confettiEffect ? "checked" : ""} onchange="toggleExtraFeature('confettiEffect', this.checked)">
      </label>
      <label class="flex items-center justify-between cursor-pointer py-0.5 text-amber-400 font-medium">
        <span>🎡 Vòng quay may mắn</span>
        <input type="checkbox" ${window.AdminExtraFeatures.luckyWheel ? "checked" : ""} onchange="toggleExtraFeature('luckyWheel', this.checked)">
      </label>
    </div>

    <div class="space-y-1 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
      <div class="font-semibold text-neutral-400 mb-1">📝 Thao tác dữ liệu</div>
      <button onclick="adminTriggerResetSlots()" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 rounded transition-all text-[10px]">
        🔄 RESET TOÀN BỘ ĐỊNH DANH LỚP
      </button>
    </div>

    <div class="space-y-1 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
      <div class="font-semibold text-red-400 mb-1">🚫 Ban thiết bị phá hoại</div>
      <input type="text" id="admin-ban-input" placeholder="Nhập Device ID cần ban..." class="w-full bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-white text-[10px] outline-none">
      <div class="flex gap-1 mt-1">
        <button onclick="adminBanDeviceAction(true)" class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-1.5 rounded transition-all text-[10px]">
          🔒 BAN DEVICE
        </button>
        <button onclick="adminBanDeviceAction(false)" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-1.5 rounded transition-all text-[10px]">
          🔓 UNBAN
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

window.toggleExtraFeature = function (featureName, isEnabled) {
  window.AdminExtraFeatures[featureName] = isEnabled;
  if (featureName === "musicBackground") {
    const player = document.getElementById("memory-bg-audio");
    if (player) isEnabled ? player.play().catch(() => {}) : player.pause();
  }
  if (featureName === "confettiEffect") {
    const canvas = document.getElementById("confetti-canvas");
    if (canvas) canvas.style.display = isEnabled ? "block" : "none";
  }
  if (featureName === "luckyWheel") {
    const wheelWidget = document.getElementById("lucky-wheel-widget");
    if (wheelWidget) wheelWidget.style.display = isEnabled ? "block" : "none";
  }
};

window.adminBanDeviceAction = async function (shouldBan) {
  const inputEl = document.getElementById("admin-ban-input");
  if (!inputEl || !inputEl.value.trim())
    return alert("Vui lòng nhập Device ID hợp lệ!");
  const targetId = inputEl.value.trim();

  if (!window.db || !window.FB_FIRESTORE)
    return alert("Hệ thống dữ liệu chưa sẵn sàng!");

  try {
    const banDocRef = window.FB_FIRESTORE.doc(
      window.db,
      "bannedDevices",
      targetId,
    );
    if (shouldBan) {
      await window.FB_FIRESTORE.setDoc(banDocRef, {
        bannedAt: Date.now(),
        reason: "Khóa thủ công từ Admin Control",
        bannedByAdmin: true,
      });
      alert(`🎉 Đã BAN thành công thiết bị: ${targetId}`);
    } else {
      await window.FB_FIRESTORE.deleteDoc(banDocRef);
      alert(`🎉 Đã GỠ BAN thành công thiết bị: ${targetId}`);
    }
    inputEl.value = "";
  } catch (error) {
    alert("Thao tác lỗi: " + error.message);
  }
};

window.adminTriggerResetSlots = async function () {
  if (
    !confirm(
      "Bạn có chắc chắn muốn xóa toàn bộ lượt chọn định danh hiện tại không?",
    )
  )
    return;
  if (!window.db || !window.FB_FIRESTORE) return alert("Kết nối Firebase lỗi!");

  try {
    const slotsCol = window.FB_FIRESTORE.collection(window.db, "memberSlots");
    const snapshot = await window.FB_FIRESTORE.getDocs(slotsCol);
    const promises = [];
    snapshot.forEach((docSnap) =>
      promises.push(window.FB_FIRESTORE.deleteDoc(docSnap.ref)),
    );
    await Promise.all(promises);
    alert("🎉 Đã khôi phục danh sách định danh lớp học về trạng thái trống!");
  } catch (err) {
    alert("Lỗi khi reset danh sách: " + err.message);
  }
};

/**
 * 3. LOGIC HOẠT ĐỘNG CỦA CÁC TÍNH NĂNG GIẢI TRÍ
 */
function initMusicPlayer() {
  const audio = document.createElement("audio");
  audio.id = "memory-bg-audio";
  audio.loop = true;
  audio.volume = 0.3;
  audio.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  document.body.appendChild(audio);
  document.addEventListener(
    "click",
    () => {
      if (window.AdminExtraFeatures.musicBackground && audio.paused)
        audio.play().catch(() => {});
    },
    { once: true },
  );
}

function initConfettiEffect() {
  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.className = "fixed inset-0 pointer-events-none z-30";
  canvas.style.display = window.AdminExtraFeatures.confettiEffect
    ? "block"
    : "none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let pieces = [];
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();
  for (let i = 0; i < 40; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 4 + 4,
      d: Math.random() * canvas.height,
      color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`,
      tilt: Math.random() * 10 - 5,
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (window.AdminExtraFeatures.confettiEffect) {
      pieces.forEach((p) => {
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
        p.y += Math.cos(p.d) + 1 + p.r / 2;
        p.tilt = Math.sin(p.d - p.r);
        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
        }
      });
    }
    requestAnimationFrame(draw);
  }
  draw();
}

function initLuckyWheelUI() {
  const box = document.createElement("div");
  box.id = "lucky-wheel-widget";
  box.className =
    "fixed bottom-4 right-4 z-40 bg-white/95 border border-brand-200 p-2.5 rounded-xl shadow-xl w-[180px] text-center";
  box.style.display = window.AdminExtraFeatures.luckyWheel ? "block" : "none";

  box.innerHTML = `
    <div class="text-[10px] font-bold text-brand-900 mb-1 uppercase">🎲 Vòng quay ngẫu nhiên</div>
    <div id="wheel-res" class="bg-brand-50 border border-dashed border-brand-200 text-brand-900 py-1.5 rounded-lg font-bold text-[11px] h-7 flex items-center justify-center truncate px-1">Chọn học sinh...</div>
    <button onclick="spinStudent()" class="w-full mt-1.5 bg-brand-700 text-white font-bold text-[10px] py-1 px-1.5 rounded-md transition-all shadow-sm hover:bg-brand-800">QUAY SỐ</button>
  `;
  document.body.appendChild(box);
}

window.spinStudent = function () {
  const display = document.getElementById("wheel-res");
  const names = [
    "Chu Thị Quỳnh Anh",
    "Lê Đức Anh",
    "Lê Văn Anh",
    "Nguyễn Hà Anh",
    "Nguyễn Phương Anh",
    "Nguyễn Thị Mai Anh",
    "Đỗ Thị Quỳnh Anh",
    "Hồ Hoàng Bách",
    "Trần Cao Bách",
    "Nguyễn Ngọc Cảnh",
    "Nguyễn Ngọc Diệu",
    "Lê Minh Dũng",
    "Nguyễn Minh Chí Dũng",
    "Nguyễn Anh Duy",
    "Nguyễn Đăng Dương",
    "Nguyễn Thuỳ Dương",
    "Dương Văn Đại",
    "Nguyễn Tiến Đạt",
    "Đỗ Hải Đăng",
    "Nguyễn Minh Đăng",
    "Nguyễn Thành Đồng",
    "Lê Tiến Đức",
    "Thái Anh Đức",
    "Đinh Thu Hà",
    "Nguyễn Thu Hà",
    "Đỗ Phú Hiền",
    "Đào Đức Huy",
    "Nguyễn Quang Huy",
    "Phạm Gia Huy",
    "Trần Nam Khánh",
    "Phạm Trung Kiên",
    "Nguyễn Khánh Linh",
    "Nguyễn Huy Long",
    "Đỗ Văn Mạnh",
    "Nguyễn Nhật Minh",
    "Nguyễn Quang Minh",
    "Hoàng Minh Nghĩa",
    "Phạm Khánh Ngọc",
    "Nguyễn Ngọc Oanh",
    "Bùi Thị Bích Phương",
    "Đinh Văn Phương",
    "Đỗ Minh Quân",
    "Nguyễn Đức Sang",
    "Nguyễn Cao Sơn",
    "Nguyễn Tự Đức Sơn",
    "Vũ Tiến Tài",
    "Nguyễn Ngọc Thanh",
    "Nguyễn Thùy Trang",
    "Vương Quốc Tuấn",
    "Nguyễn Thị Vân",
    "Phạm Quốc Việt",
  ];
  let count = 0;
  const timer = setInterval(() => {
    display.innerText = "⏳ " + names[Math.floor(Math.random() * names.length)];
    if (++count > 10) {
      clearInterval(timer);
      display.innerHTML = `🎉 <span class="text-brand-700">${names[Math.floor(Math.random() * names.length)]}</span>`;
    }
  }, 90);
};
