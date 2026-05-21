/**
 * Planit Auth System — Login Logic Engine (Bug Fixed Edition)
 * 1. 눈 모양 토글 버튼 오작동 방지 단독 트리거 구현.
 * 2. 이메일 미인증 상태 정확히 필터링 및 리다이렉트.
 * 3. 로컬 스토리지 키값 'planit-token' 강제 적재.
 */
import { auth } from "./firebase.js";
import { 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM 로드가 완료되면 안전하게 리스너 바인딩 시작
document.addEventListener('DOMContentLoaded', () => {

    // --- 👁️ [FIX] 비밀번호 보기/숨기기 단독 직관적 트리거 ---
    const toggleBtn = document.getElementById('btn-toggle-password');
    const passwordInput = document.getElementById('login-password');

    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 혹시 모를 폼 서브밋 버블링 방지
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.classList.add('active');
                toggleBtn.style.color = '#00F0FF'; // 가시성을 위해 민트색 강제 하이라이트
            } else {
                passwordInput.type = 'password';
                toggleBtn.classList.remove('active');
                toggleBtn.style.color = '#8A919E'; // 원복
            }
        });
    } else {
        console.error("❌ [ERROR] 비밀번호 토글 버튼 엘리먼트를 찾을 수 없습니다.");
    }

    // --- 🔐 [CORE] 로그인 인가 처리 루틴 ---
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('btn-login');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = passwordInput ? passwordInput.value : '';

        try {
            if (loginBtn) {
                loginBtn.disabled = true; // 더블 서브밋 방지
                loginBtn.innerText = "보안 세션 수립 중...";
            }

            // 1. Firebase 로그인 커밋
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log("▶ Firebase Auth 1차 로그인 검증 통과:", user.email);

            // 2. 🔥 [핵심 가드] 이메일 인증 통과 여부 검독
            if (!user.emailVerified) {
                alert("⚠️ 이메일 인증이 완료되지 않은 계정입니다.\n가입하신 메일함을 확인하여 인증 링크를 클릭해 주세요.");
                
                // 미인증 계정이므로 세션을 즉시 폭파하고 토큰 오염 차단
                await signOut(auth);
                localStorage.removeItem("planit-token");
                
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.innerText = "Sign In";
                }
                
                // 가입 페이지의 인증 대기창 화면으로 롤백 리다이렉트
                window.location.href = "../registar/index.html";
                return;
            }

            // 3. 🔥 [요구사항] 'planit-token' 이라는 이름으로 로컬 스토리지 적재
            const planitToken = await user.getIdToken(true);
            localStorage.setItem("planit-token", planitToken);

            console.log("🟢 [TOKEN SAVE SUCCESS] 'planit-token' 적재 완료.");
            alert(`${user.displayName || '유저'}님, 환영합니다!`);
            
            // 최종 메인 홈 화면 진입 승인
            window.location.href = "../index.html";

        } catch (error) {
            console.error("❌ [LOGIN CRASH] 에러 코드:", error.code, "| 메시지:", error.message);
            
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                alert("이메일 또는 비밀번호가 일치하지 않습니다. 다시 확인해 주세요.");
            } else if (error.code === 'auth/too-many-requests') {
                alert("과도한 로그인 시도가 감지되었습니다. 잠시 후 다시 시도해 주세요.");
            } else {
                alert(`로그인 실패: ${error.message}`);
            }
            
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerText = "Sign In";
            }
        }
    });
});