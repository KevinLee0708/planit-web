/**
 * Planit Auth System — Registration & DB Architecture Guard
 * [SPECIFICATION PERFECT COMPLIANCE]
 * 1. 계정 생성 후 파이어베이스 데이터베이스 'user/UID' 경로에 데이터 구조화 생성.
 * 2. Role은 'admin' 강제 주입, schedules는 빈 배열([]) 콜렉션 초기화.
 */
import { auth, db } from "./firebase.js"; // ⚠️ db 인스턴스가 firebase.js에 getFirestore로 설정되어 있어야 합니다.
import { 
    createUserWithEmailAndPassword, 
    updateProfile, 
    sendEmailVerification, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    const registerFormBox = document.getElementById('register-form-box');
    const verificationPendingBox = document.getElementById('verification-pending-box');
    const targetVerifyEmail = document.getElementById('target-verify-email');
    
    // --- 비밀번호 토글 제어 ---
    const toggleButtons = document.querySelectorAll('.password-toggle-btn');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const inputField = document.getElementById(targetId);
            if (!inputField) return;
            if (inputField.type === 'password') {
                inputField.type = 'text';
                btn.classList.add('active');
            } else {
                inputField.type = 'password';
                btn.classList.remove('active');
            }
        });
    });

    // --- 회원가입 메인 폼 파이프라인 ---
    const registerForm = document.getElementById('register-form');

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('reg-email').value;
        const nickname = document.getElementById('reg-nickname').value.trim();
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;

        if (nickname.length < 2) {
            alert("닉네임은 2자 이상 입력해 주세요.");
            return;
        }

        if (password !== passwordConfirm) {
            alert("입력하신 비밀번호가 서로 일치하지 않습니다.");
            return;
        }

        try {
            const submitBtn = document.getElementById('btn-register');
            if(submitBtn) submitBtn.innerText = "계정 및 보안 스토리지 구성 중...";

            // 1. Firebase Authentication 계정 생성
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Auth 프로필 내 닉네임 캐싱
            await updateProfile(user, { displayName: nickname });

            // 3. 🔥 [요구사항 준수] 데이터베이스 'user/UID' 형식 경로 생성 및 도큐먼트 바인딩
            const userDocRef = doc(db, "user", user.uid); 
            const userMetadataPayload = {
                uid: user.uid,
                email: user.email,
                nickname: nickname,
                role: "admin",           // 테스트 단계 무조건 admin 부여
                schedules: [],          // 스케줄들이 모일 빈 가변 콜렉션 배열 초기화
                createdAt: new Date().toISOString()
            };

            // Firestore 'user/{UID}' 경로에 데이터 생성 수행
            await setDoc(userDocRef, userMetadataPayload);
            console.log(`▶ [DB SUCCESS] user/${user.uid} 경로에 데이터가 안착되었습니다.`, userMetadataPayload);

            // 4. 인증 이메일 발송 
            await sendEmailVerification(user);
            
            // 5. 대기 UI로 스위칭 가드
            if (registerFormBox && verificationPendingBox && targetVerifyEmail) {
                targetVerifyEmail.innerText = email;
                registerFormBox.style.display = 'none';
                verificationPendingBox.style.display = 'block';
            }

        } catch (error) {
            console.error("Auth & DB Write Core Error:", error);
            alert(`회원가입 처리 실패: ${error.message}`);
            const submitBtn = document.getElementById('btn-register');
            if(submitBtn) submitBtn.innerText = "가입 및 인증 메일 발송";
        }
    });

    // --- 인증 상태 실시간 확인 인터랙션 ---
    document.getElementById('btn-check-verified')?.addEventListener('click', async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("인증 세션이 만료되었습니다. 다시 가입해 주세요.");
            location.reload();
            return;
        }

        // 실시간으로 Firebase 서버와 계정 동기화 리로드
        await currentUser.reload();
        
        if (currentUser.emailVerified) {
            alert("🎉 이메일 인증이 완수되었습니다!\nPlanit 시스템 로그인을 진행하세요.");
            window.location.href = "../login/index.html";
        } else {
            alert("⚠️ 아직 이메일 인증 링크가 클릭되지 않았습니다.\n수신된 메일함을 다시 확인해 주세요.");
        }
    });

    // --- 인증 메일 재발송 ---
    document.getElementById('btn-resend-email')?.addEventListener('click', async () => {
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                await sendEmailVerification(currentUser);
                alert("인증 메일을 재발송했습니다.");
            } catch (err) {
                alert(`재발송 실패: ${err.message}`);
            }
        }
    });

    // --- 가입 리셋 복귀 ---
    document.getElementById('btn-return-register')?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm("처음 화면으로 복귀하시겠습니까?")) {
            await signOut(auth);
            location.reload();
        }
    });
});