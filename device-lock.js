// const DEVICE_ID_STORAGE_KEY = "tx_device_id";
// const DEVICE_LOCK_DOC_PATH = {
//   collection: "deviceLockSettings",
//   docId: "global",
// };
// const DEVICE_BANS_COLLECTION = "bannedDevices";
// const ADMIN_ATTEMPTS_COLLECTION = "adminLoginAttempts";

// function generateStableDeviceId() {
//   const random = () => Math.random().toString(36).substring(2, 10);
//   return `tx-${random()}-${random()}-${Date.now()}`;
// }

// window.getOrCreateDeviceId = function () {
//   let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
//   if (!deviceId) {
//     deviceId = generateStableDeviceId();
//     localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
//   }
//   return deviceId;
// };

// window.isDeviceLockEnabled = async function () {
//   if (!window.db || !window.FB_FIRESTORE) {
//     return false;
//   }
//   try {
//     const lockDoc = window.FB_FIRESTORE.doc(
//       window.db,
//       DEVICE_LOCK_DOC_PATH.collection,
//       DEVICE_LOCK_DOC_PATH.docId,
//     );
//     const snapshot = await window.FB_FIRESTORE.getDoc(lockDoc);
//     if (!snapshot.exists()) {
//       return false;
//     }
//     const data = snapshot.data();
//     return !!data?.enabled;
//   } catch (error) {
//     console.warn("Lỗi kiểm tra chế độ khóa thiết bị:", error);
//     return false;
//   }
// };

// window.setDeviceLockEnabled = async function (enabled) {
//   if (!window.db || !window.FB_FIRESTORE) {
//     return false;
//   }
//   try {
//     const lockDoc = window.FB_FIRESTORE.doc(
//       window.db,
//       DEVICE_LOCK_DOC_PATH.collection,
//       DEVICE_LOCK_DOC_PATH.docId,
//     );
//     await window.FB_FIRESTORE.setDoc(lockDoc, {
//       enabled: !!enabled,
//       updatedAt: Date.now(),
//     });
//     return true;
//   } catch (error) {
//     console.error("Lỗi setDeviceLockEnabled:", error);
//     return false;
//   }
// };

// window.checkCurrentDeviceBanStatus = async function () {
//   const deviceId = window.getOrCreateDeviceId();
//   if (!window.db || !window.FB_FIRESTORE) {
//     return false;
//   }
//   try {
//     const lockEnabled = await window.isDeviceLockEnabled();
//     if (!lockEnabled) {
//       return false;
//     }
//     const banDoc = window.FB_FIRESTORE.doc(
//       window.db,
//       DEVICE_BANS_COLLECTION,
//       deviceId,
//     );
//     const snapshot = await window.FB_FIRESTORE.getDoc(banDoc);
//     return snapshot.exists();
//   } catch (error) {
//     console.warn("Lỗi kiểm tra thiết bị bị ban:", error);
//     return false;
//   }
// };

// window.enforceDeviceLockUI = async function () {
//   const banned = await window.checkCurrentDeviceBanStatus();
//   const lockEnabled = await window.isDeviceLockEnabled();
//   const overlayId = "device-ban-overlay";
//   let overlay = document.getElementById(overlayId);

//   if (banned && lockEnabled && !window.isAdminActive) {
//     if (!overlay) {
//       overlay = document.createElement("div");
//       overlay.id = overlayId;
//       overlay.className =
//         "fixed inset-0 z-[9999] bg-black/85 text-white p-6 flex flex-col items-center justify-center text-center gap-4";
//       overlay.innerHTML = `
//         <div class="max-w-xl">
//           <h2 class="text-2xl font-bold mb-2">🚫 Thiết bị đã bị khóa</h2>
//           <p class="text-sm text-neutral-200 leading-relaxed mb-4">
//             Thiết bị này đã bị admin khóa vì hành vi đăng nhập hoặc giả mạo không hợp lệ.
//             Vui lòng liên hệ admin để mở khóa.
//           </p>
//           <div class="text-left text-[11px] text-neutral-300 bg-white/10 border border-white/10 rounded-2xl p-4">
//             <p><strong>ID thiết bị:</strong> <span id="device-ban-id">${window.getOrCreateDeviceId()}</span></p>
//             <p><strong>Chế độ khóa thiết bị:</strong> BẬT</p>
//           </div>
//         </div>
//       `;
//       document.body.appendChild(overlay);
//     }
//     overlay.classList.remove("hidden");
//     document.body.style.overflow = "hidden";
//   } else {
//     if (overlay) {
//       overlay.classList.add("hidden");
//     }
//     document.body.style.overflow = "";
//   }
// };

// window.recordAdminLoginAttempt = async function (success, email, reason) {
//   const deviceId = window.getOrCreateDeviceId();
//   if (!window.db || !window.FB_FIRESTORE) {
//     return;
//   }
//   try {
//     await window.FB_FIRESTORE.addDoc(
//       window.FB_FIRESTORE.collection(window.db, ADMIN_ATTEMPTS_COLLECTION),
//       {
//         deviceId,
//         email,
//         success: !!success,
//         reason,
//         timestamp: Date.now(),
//       },
//     );
//   } catch (error) {
//     console.warn("Lỗi ghi nhật ký đăng nhập admin:", error);
//   }

//   if (!success) {
//     try {
//       const timeWindow = Date.now() - 30 * 60 * 1000;
//       const attemptsQuery = window.FB_FIRESTORE.query(
//         window.FB_FIRESTORE.collection(window.db, ADMIN_ATTEMPTS_COLLECTION),
//         window.FB_FIRESTORE.where("deviceId", "==", deviceId),
//         window.FB_FIRESTORE.where("success", "==", false),
//         window.FB_FIRESTORE.where("timestamp", ">=", timeWindow),
//       );
//       const snapshot = await window.FB_FIRESTORE.getDocs(attemptsQuery);
//       const failureCount = snapshot.size;
//       const threshold = 5;
//       if (failureCount >= threshold) {
//         await window.FB_FIRESTORE.setDoc(
//           window.FB_FIRESTORE.doc(window.db, DEVICE_BANS_COLLECTION, deviceId),
//           {
//             bannedAt: Date.now(),
//             reason: "too_many_failed_admin_logins",
//             failures: failureCount,
//           },
//         );
//       }
//     } catch (error) {
//       console.warn("Lỗi kiểm tra và ban thiết bị tự động:", error);
//     }
//   }
// };

// window.addEventListener("firebaseInitialized", () => {
//   if (typeof window.enforceDeviceLockUI === "function") {
//     window.enforceDeviceLockUI();
//   }
// });

// window.addEventListener("adminActivated", async () => {
//   if (typeof window.enforceDeviceLockUI === "function") {
//     await window.enforceDeviceLockUI();
//   }
// });

// window.addEventListener("adminDeactivated", async () => {
//   if (typeof window.enforceDeviceLockUI === "function") {
//     await window.enforceDeviceLockUI();
//   }
// });
/**
 * =========================================================================
 * FILE BẢO MẬT: KHÓA CỨNG ĐỊNH DANH ADMIN & CẢNH BÁO THIẾT BỊ LẠ
 * Không can thiệp, giữ nguyên 100% cấu trúc của index.html và script.js
 * =========================================================================
 */

const HARDCODED_ADMIN_UID = "1xuZEHo6N7ZJcyDEIPDJtXaCBuG3";
const DEVICE_ID_STORAGE_KEY = "tx_admin_trusted_device";
const ADMIN_ALERTS_COLLECTION = "adminSecurityAlerts";

// 1. Tạo hoặc lấy mã định danh thiết bị duy nhất (Device ID) lưu trong trình duyệt
function getOrCreateDeviceFingerprint() {
  let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!deviceId) {
    const randomHex = () => Math.random().toString(36).substring(2, 15);
    deviceId = `dev-${randomHex()}-${randomHex()}-${Date.now()}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

// 2. Lắng nghe trạng thái đăng nhập hệ thống Firebase toàn cục
window.addEventListener("firebaseInitialized", () => {
  if (!window.auth || !window.db || !window.FB_FIRESTORE) {
    console.warn(
      "-> [Bảo mật] Thiếu thư viện Firebase để thiết lập khóa Admin.",
    );
    return;
  }

  const { onAuthStateChanged, signOut } = window.auth;
  const { collection, addDoc } = window.FB_FIRESTORE;

  // Giám sát mọi hành vi đăng nhập/thay đổi phiên của tài khoản đăng nhập
  onAuthStateChanged(window.auth, async (user) => {
    if (!user) return;

    // Kiểm tra xem tài khoản đang cố đăng nhập có UID trùng khớp với Admin không
    if (user.uid === HARDCODED_ADMIN_UID) {
      const currentDevice = getOrCreateDeviceFingerprint();

      // Kiểm tra xem thiết bị này đã từng được Admin xác minh (tin tưởng) chưa
      // Ở phiên đăng nhập đầu tiên chính chủ, có thể lưu dấu 'verified' vào localStorage
      let isTrustedDevice =
        localStorage.getItem(`trusted_${HARDCODED_ADMIN_UID}`) === "true";

      // Nếu là lần đầu tiên đăng nhập thiết bị này và chưa được đánh dấu tin tưởng
      if (!isTrustedDevice) {
        // Đây là thiết bị lạ cố tình đăng nhập vào tài khoản Admin!
        console.error(
          "🚨 [CẢNH BÁO] Phát hiện thiết bị lạ cố gắng truy cập quyền Admin!",
        );

        try {
          // Gửi thông báo trực tiếp lên cơ sở dữ liệu Cloud Firestore đám mây công khai
          // Tài khoản Admin đã đăng ký đăng nhập trên thiết bị chính chủ sẽ nhận được thông báo thời gian thực này ngay lập tức
          await addDoc(collection(window.db, ADMIN_ALERTS_COLLECTION), {
            alertType: "UNAUTHORIZED_ADMIN_LOGIN_ATTEMPT",
            adminUid: HARDCODED_ADMIN_UID,
            detectedAt: Date.now(),
            userAgent: navigator.userAgent,
            deviceId: currentDevice,
            status: "BLOCKED",
            message:
              "Có thiết bị lạ (Trình duyệt/Vị trí mới) đang cố tình đăng nhập bằng ID tài khoản Admin của bạn!",
          });

          // Hiển thị thông báo trực tiếp lên màn hình thiết bị lạ đó
          alert(
            "🚨 CẢNH BÁO BẢO MẬT:\nThiết bị lạ cố tình truy cập tài khoản Admin khóa cứng. Hành vi của bạn đã được ghi nhận và gửi báo động đến Admin đăng ký!",
          );
        } catch (err) {
          console.error("Lỗi gửi cảnh báo bảo mật:", err);
        }

        // Thực hiện CƯỠNG CHẾ ĐĂNG XUẤT ngay lập tức, không cho phép thiết bị lạ này truy cập dữ liệu
        await signOut(window.auth);

        // Reload lại trang để xóa hoàn toàn state/token cũ
        window.location.reload();
      } else {
        console.log("-> [Bảo mật] Thiết bị Admin chính chủ hợp lệ.");
      }
    }
  });
});

/**
 * Hàm tiện ích dành riêng cho Admin chính chủ:
 * Khi Admin đăng nhập trên thiết bị an toàn của mình lần đầu tiên, hãy mở Console F12 và gõ:
 * approveCurrentDevice()
 * Thiết bị đó sẽ được đưa vào danh sách tin tưởng và không bị chặn.
 */
window.approveCurrentDevice = function () {
  localStorage.setItem(`trusted_${HARDCODED_ADMIN_UID}`, "true");
  alert(
    "Thành công: Thiết bị hiện tại của bạn đã được xác minh là Admin chính chủ tin tưởng!",
  );
  window.location.reload();
};
