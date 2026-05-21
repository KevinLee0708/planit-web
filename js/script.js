import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // 1. UI 요소 선택
    const toggle = document.getElementById('menu-toggle');
    const close = document.getElementById('menu-close');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('menu-overlay');
    const commTrigger = document.getElementById('mobile-comm-trigger');
    const commContent = document.getElementById('mobile-comm-content');
    const authMenuList = document.getElementById('auth-menu-list');
    const mobileAuthText = document.getElementById('mobile-auth-text');

    // 2. 사이드바 제어
    const handleMenu = (state) => {
        if(!sidebar || !overlay) return;
        sidebar.classList.toggle('active', state);
        overlay.classList.toggle('active', state);
        document.body.style.overflow = state ? 'hidden' : '';
    };

    toggle?.addEventListener('click', () => handleMenu(true));
    close?.addEventListener('click', () => handleMenu(false));
    overlay?.addEventListener('click', () => handleMenu(false));

    // 3. 모바일 아코디언 (커뮤니티 메뉴)
    commTrigger?.addEventListener('click', () => {
        const isActive = commTrigger.classList.toggle('active');
        commContent.style.maxHeight = isActive ? commContent.scrollHeight + "px" : "0px";
    });

    /**
     * 4. Navbar Auth UI 업데이트 (실시간 상태 반영)
     */
    const updateAuthUI = (user) => {
        if (!authMenuList) return;

        // 상대 경로 설정을 위해 (index.html 기준)
        const pathPrefix = window.location.pathname.includes('/login/') || window.location.pathname.includes('/registar/') ? '../' : './';

        if (user && user.emailVerified) {
            // [로그인 상태]
            const nickname = user.displayName || "사용자";
            if (mobileAuthText) mobileAuthText.innerText = nickname;

            authMenuList.innerHTML = `
                <li class="menu-status">${nickname}님 환영합니다</li>
                <hr class="divider">
                <li><a href="#" id="btn-logout">로그아웃</a></li>
                <li><a href="${pathPrefix}account/index.html">내 계정</a></li>
            `;

            document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
                e.preventDefault();
                await signOut(auth);
                localStorage.removeItem("planit-token");
                location.reload();
            });
        } else {
            // [로그아웃 상태]
            if (mobileAuthText) mobileAuthText.innerText = "로그인해주세요";

            authMenuList.innerHTML = `
                <li class="menu-status">로그인이 필요합니다</li>
                <hr class="divider">
                <li><a href="${pathPrefix}login/index.html">로그인</a></li>
                <li><a href="${pathPrefix}registar/index.html">회원가입</a></li>
            `;
        }
    };

    // Firebase 인증 상태 관찰자 실행
    onAuthStateChanged(auth, (user) => {
        updateAuthUI(user);
    });

    // 5. 스크롤 네비바 효과
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('global-nav');
        if (!nav) return;
        if (window.scrollY > 40) {
            nav.style.width = '100%'; nav.style.top = '0'; nav.style.borderRadius = '0';
            nav.style.background = 'rgba(2, 4, 8, 0.98)';
        } else {
            nav.style.width = '92%'; nav.style.top = '15px'; nav.style.borderRadius = '20px';
            nav.style.background = 'var(--glass)';
        }
    }, { passive: true });
});