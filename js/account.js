import { getAuth, onAuthStateChanged, updateProfile, updatePassword, verifyBeforeUpdateEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { triggerToastNotification } from "./notifications.js"; // 상단 알림 허브 토스트 바인딩

const auth = getAuth();

// 👁️ [공통 기능]: 비밀번호 토글 버튼 바인딩 엔진
document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("pwd-toggle-btn")) {
        const targetId = e.target.getAttribute("data-target");
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
            if (targetInput.type === "password") {
                targetInput.type = "text";
                e.target.textContent = "숨기기";
            } else {
                targetInput.type = "password";
                e.target.textContent = "보기";
            }
        }
    }
});

// 세션 체킹 모니터 연동
onAuthStateChanged(auth, (user) => {
    const currentNicknameInput = document.getElementById("input-current-nickname");
    const currentEmailInput = document.getElementById("input-current-email");
    const sidebarNickname = document.getElementById("mobile-user-nickname");

    if (user) {
        const userDisplayName = user.displayName || user.email.split('@')[0] || "Planit 유저";
        if (currentNicknameInput) {
            currentNicknameInput.value = userDisplayName;
            currentNicknameInput.classList.remove("field-readonly");
        }
        if (currentEmailInput) currentEmailInput.value = user.email;
        if (sidebarNickname) sidebarNickname.textContent = userDisplayName;
    }
});

/**
 * 1. 닉네임 변경 (즉시 반영)
 */
document.getElementById("form-update-profile")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return triggerToastNotification("오류", "로그인 세션이 없습니다.");

    const newNickname = document.getElementById("input-new-nickname").value.trim();
    if (!newNickname) return triggerToastNotification("경고", "변경할 닉네임을 입력하세요.");

    try {
        await updateProfile(user, { displayName: newNickname });
        triggerToastNotification("성공", `닉네임이 ${newNickname}(으)로 변경되었습니다.`);
        document.getElementById("input-current-nickname").value = newNickname;
        document.getElementById("input-new-nickname").value = "";
    } catch (err) {
        console.error(err);
        triggerToastNotification("오류", "닉네임 업데이트에 실패했습니다.");
    }
});

/**
 * 2. 이메일 변경 (비밀번호 검증 후 새 이메일로 인증 메일 발송)
 */
document.getElementById("form-update-email")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return triggerToastNotification("오류", "로그인 세션이 없습니다.");

    const currentPwd = document.getElementById("email-current-password").value;
    const newEmail = document.getElementById("input-new-email").value.trim();

    if (!currentPwd || !newEmail) return triggerToastNotification("경고", "모든 필드를 채워주세요.");

    try {
        // 보안 처리를 위한 필수 재인증 프로세스 구동
        const credential = EmailAuthProvider.credential(user.email, currentPwd);
        await reauthenticateWithCredential(user, credential);

        // 최신 Firebase v10 보안 규격: 새 이메일로 인증 링크 발송 후 검증 완료 시 자동 변경 트랙 진입
        await verifyBeforeUpdateEmail(user, newEmail);
        triggerToastNotification("인증 요청", `${newEmail}로 확인 메일을 보냈습니다. 링크를 클릭해야 변경이 완료됩니다.`);
        
        document.getElementById("email-current-password").value = "";
        document.getElementById("input-new-email").value = "";
    } catch (err) {
        console.error(err);
        if (err.code === "auth/wrong-password") {
            triggerToastNotification("오류", "현재 비밀번호가 일치하지 않습니다.");
        } else {
            triggerToastNotification("오류", "이메일 업데이트 인증 프로세스 실패");
        }
    }
});

/**
 * 3. 비밀번호 변경 (현재 비밀번호 + 새 비밀번호 2번 체크)
 */
document.getElementById("form-update-password")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return triggerToastNotification("오류", "로그인 세션이 없습니다.");

    const currentPwd = document.getElementById("input-current-password").value;
    const newPwd = document.getElementById("input-new-password").value;
    const confirmPwd = document.getElementById("input-confirm-password").value;

    if (newPwd !== confirmPwd) {
        return triggerToastNotification("비밀번호 불일치", "새로 입력한 두 비밀번호가 서로 다릅니다.");
    }
    if (newPwd.length < 6) {
        return triggerToastNotification("보안 취약", "새 비밀번호는 최소 6자리 이상이어야 합니다.");
    }

    try {
        const credential = EmailAuthProvider.credential(user.email, currentPwd);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPwd);
        triggerToastNotification("성공", "비밀번호가 안전하게 변경되었습니다.");
        
        document.getElementById("input-current-password").value = "";
        document.getElementById("input-new-password").value = "";
        document.getElementById("input-confirm-password").value = "";
    } catch (err) {
        console.error(err);
        if (err.code === "auth/wrong-password") {
            triggerToastNotification("오류", "현재 비밀번호가 올바르지 않습니다.");
        } else {
            triggerToastNotification("오류", "비밀번호 변경 실패");
        }
    }
});

/**
 * 4. 회원 탈퇴 (모달 토글 제어 및 비밀번호 + 이메일 강제 교차 검증 파기)
 */
const terminationModal = document.getElementById("termination-modal");

document.getElementById("btn-terminate-account")?.addEventListener("click", () => {
    if (terminationModal) terminationModal.style.display = "flex";
});

document.getElementById("btn-modal-cancel")?.addEventListener("click", () => {
    if (terminationModal) terminationModal.style.display = "none";
});

document.getElementById("btn-modal-confirm-delete")?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return triggerToastNotification("오류", "인증 세션이 없습니다.");

    const inputEmail = document.getElementById("delete-confirm-email").value.trim();
    const inputPwd = document.getElementById("delete-confirm-password").value;

    if (inputEmail !== user.email) {
        return triggerToastNotification("검증 실패", "현재 로그인된 계정의 이메일 주소와 다릅니다.");
    }

    try {
        // 탈퇴 전 최후의 권한 인증 체킹
        const credential = EmailAuthProvider.credential(user.email, inputPwd);
        await reauthenticateWithCredential(user, credential);

        await deleteUser(user);
        if (terminationModal) terminationModal.style.display = "none";
        
        alert("Planit 회원 탈퇴가 최종 확정되어 모든 데이터가 영구 파기되었습니다.");
        window.location.href = "../index.html"; // 메인 홈으로 튕기기
    } catch (err) {
        console.error(err);
        if (err.code === "auth/wrong-password") {
            triggerToastNotification("오류", "탈퇴 비밀번호 인증에 실패했습니다.");
        } else {
            triggerToastNotification("오류", "계정 파기 트랜잭션 수행 실패");
        }
    }
});