/**
 * Planit Auth System — Login Engine & Password Reset Guard
 * [SPECIFICATION PERFECT COMPLIANCE]
 * 회원가입 시스템과 동일한 Firebase 인스턴스 아키텍처를 재활용하여 동작을 보장합니다.
 */
import { auth } from "./firebase.js"; 
import { 
    signInWithEmailAndPassword,
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const togglePasswordBtn = document.getElementById('btn-toggle-password');
    const passwordInput = document.getElementById('login-password');

    // --- 1. 비밀번호 보기 / 숨기기 토글 제어 ---
    togglePasswordBtn?.addEventListener('click', () => {
        if (!passwordInput) return;
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePasswordBtn.classList.add('active');
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.classList.remove('active');
        }
    });

    // --- 2. 로그인 메인 폼 파이프라인 ---
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = passwordInput.value;
        const loginBtn = document.getElementById('btn-login');

        try {
            if (loginBtn) loginBtn.innerText = "보안 세션 동기화 중...";

            // Firebase Authentication 로그인 인증 수행
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 이메일 인증 완료 여부 가드 검증
            if (!user.emailVerified) {
                alert("⚠️ 이메일 인증이 완수되지 않았습니다.\n가입하신 메일함을 확인하여 인증 링크를 클릭해 주세요.");
                if (loginBtn) loginBtn.innerText = "Sign In";
                return;
            }

            console.log(`▶ [LOGIN SUCCESS] UID: ${user.uid} 계정 세션 안착.`);
            window.location.href = "../account/index.html"; 

        } catch (error) {
            console.error("Login Core Error:", error);
            let errMsg = "로그인 처리 실패: 이메일 또는 비밀번호를 확인하세요.";
            
            if (error.code === "auth/too-many-requests") {
                errMsg = "과도한 로그인 시도로 인해 계정이 일시 잠금되었습니다. 잠시 후 다시 시도해 주세요.";
            }
            alert(errMsg);
            if (loginBtn) loginBtn.innerText = "Sign In";
        }
    });

    // --- 3. 🔥 [동작 보장] 비밀번호 재설정 모달 팝업 제어 인터랙션 ---
    const resetModal = document.getElementById('reset-pwd-modal');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const btnResetCancel = document.getElementById('btn-reset-cancel');
    const btnResetSubmit = document.getElementById('btn-reset-submit');
    const resetEmailInput = document.getElementById('reset-email-input');

    // "비밀번호를 잊으셨나요?" 클릭 시 팝업 가동
    btnForgotPassword?.addEventListener('click', (e) => {
        e.preventDefault();
        if (resetModal) {
            resetModal.style.display = 'flex'; // 숨겨진 팝업 레이어 노출
            
            // 사용 편의성: 로그인 이메일 칸에 입력 값이 있다면 팝업창 이메일 칸에 즉시 동기화
            const currentEmail = document.getElementById('login-email')?.value.trim();
            if (currentEmail && resetEmailInput) {
                resetEmailInput.value = currentEmail;
            }
            resetEmailInput?.focus();
        }
    });

    // 팝업 닫기 제어 (취소 버튼)
    btnResetCancel?.addEventListener('click', () => {
        if (resetModal) resetModal.style.display = 'none';
    });

    // 팝업 어두운 배경 영역 클릭 시 자동 닫기 안전 가드
    resetModal?.addEventListener('click', (e) => {
        if (e.target === resetModal) {
            resetModal.style.display = 'none';
        }
    });

    // 실제 비밀번호 초기화 메일 발송 트랜잭션
    btnResetSubmit?.addEventListener('click', async () => {
        const email = resetEmailInput.value.trim();

        if (!email) {
            alert("링크를 수신할 이메일 주소를 입력해 주세요.");
            resetEmailInput.focus();
            return;
        }

        try {
            btnResetSubmit.innerText = "메일 전송 중...";
            btnResetSubmit.disabled = true;

            // auth 인스턴스를 재활용하여 파이어베이스 패스워드 리셋 이메일 발송 촉발
            await sendPasswordResetEmail(auth, email);

            alert(`🎉 비밀번호 재설정 이메일이 발송되었습니다!\n[${email}] 수신함을 확인하여 비밀번호를 변경하세요.`);
            if (resetModal) resetModal.style.display = 'none';

        } catch (error) {
            console.error("Password Reset Core Error:", error);
            if (error.code === "auth/user-not-found") {
                alert("해당 이메일로 가입된 회원 정보가 존재하지 않습니다.");
            } else if (error.code === "auth/invalid-email") {
                alert("유효한 이메일 주소 형식이 아닙니다.");
            } else {
                alert(`오류가 발생했습니다: ${error.message}`);
            }
        } finally {
            if (btnResetSubmit) {
                btnResetSubmit.innerText = "초기화 메일 전송";
                btnResetSubmit.disabled = false;
            }
        }
    });
});