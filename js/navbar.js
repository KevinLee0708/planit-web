/**
 * Planit Navbar Dynamic Business Logic Module
 * UI 상호작용 및 Firebase Auth 세션 핸들러 통합 관리
 */
import { auth } from "./firebase.js"; // 🎯 ESM 명세에 따른 일관된 상대 임포트 유지
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 0. 현재 도메인 뎁스 계산 엔진 및 하위 호환성 패치 ---
    const depthCount = (window.location.pathname.match(/\//g) || []).length;

    // --- 1. 모바일 드로어 사이드바 캐싱 및 상태 정의 ---
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('menu-overlay');

    const toggleSidebar = (openState) => {
        if (!sidebar || !overlay) return;
        sidebar.classList.toggle('active', openState);
        overlay.classList.toggle('active', openState);
        document.body.style.overflow = openState ? 'hidden' : '';
    };

    menuToggle?.addEventListener('click', () => toggleSidebar(true));
    menuClose?.addEventListener('click', () => toggleSidebar(false));
    overlay?.addEventListener('click', () => toggleSidebar(false));

    // --- 2. 모바일 아코디언 상호 배제 애니메이션 엔진 ---
    const accordions = [
        { triggerId: 'm-trigger-community', contentId: 'm-content-community' },
        { triggerId: 'm-trigger-devlog', contentId: 'm-content-devlog' }
    ];

    accordions.forEach((target) => {
        const trigger = document.getElementById(target.triggerId);
        const content = document.getElementById(target.contentId);

        trigger?.addEventListener('click', (e) => {
            e.preventDefault();
            const isCurrentlyExpanded = trigger.classList.contains('active');

            accordions.forEach((other) => {
                const otherTrigger = document.getElementById(other.triggerId);
                const otherContent = document.getElementById(other.contentId);
                
                if (otherTrigger && otherContent) {
                    otherTrigger.classList.remove('active');
                    otherContent.classList.remove('active');
                    otherContent.style.cssText = "max-height: 0px !important; margin-top: 0px !important; padding: 0px !important;";
                }
            });

            if (!isCurrentlyExpanded && content) {
                trigger.classList.add('active');
                content.classList.add('active');
                if (content.style.removeAttribute) {
                    content.style.removeAttribute('style');
                } else {
                    content.removeAttribute('style');
                }
                content.style.maxHeight = `${content.scrollHeight}px`;
            }
        });
    });

    // --- 3. 글로벌 스크롤 애니메이션 옵티마이저 ---
    const globalNav = document.getElementById('global-nav');
    window.addEventListener('scroll', () => {
        if (!globalNav) return;
        if (window.scrollY > 40) {
            globalNav.style.width = '100%';
            globalNav.style.top = '0';
            globalNav.style.borderRadius = '0';
            globalNav.style.background = 'rgba(3, 5, 9, 0.98)';
        } else {
            globalNav.style.width = '92%';
            globalNav.style.top = '15px';
            globalNav.style.borderRadius = '20px';
            globalNav.style.background = 'var(--nav-bg)';
        }
    }, { passive: true });

    // --- 4. 독립 컴포넌트형 런타임 Auth UI 주입 엔진 ---
    const authMenuList = document.getElementById('auth-menu-list');
    const mobileAuthText = document.getElementById('mobile-auth-text');
    const mobileSidebarAuthWrapper = document.getElementById('mobile-sidebar-auth-wrapper');

    const renderAuthSystem = (user) => {
        const isSubPage = window.location.pathname.includes('/login/') || window.location.pathname.includes('/registar/') || window.location.pathname.includes('/notice/') || window.location.pathname.includes('/devlog/');
        const root = isSubPage ? '../' : './';
        const prefix = depthCount > 2 ? '../../' : root;

        if (user) {
            const nickname = user.displayName || "행복한 한화팬";

            if (mobileAuthText) mobileAuthText.innerText = ""; 
            
            if (authMenuList) {
                authMenuList.innerHTML = `
                    <li class="menu-status" style="padding: 10px 16px; color: #8A919E; font-size: 0.85rem;">${nickname}님 환영합니다</li>
                    <hr class="divider" style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 6px 0;">
                    <li><a href="${prefix}account/index.html">내 계정</a></li>
                    <li><a href="#" id="desktop-logout-btn" style="color: #FF4B4B !important; font-weight: 700;">로그아웃</a></li>
                `;
            }

            if (mobileSidebarAuthWrapper) {
                mobileSidebarAuthWrapper.innerHTML = `
                    <div class="mobile-user-info" style="display: flex; align-items: center; gap: 8px; padding: 12px 0; color: #ffffff; font-weight: 600;">
                        <svg class="account-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>${nickname}</span>
                    </div>
                    <hr class="divider" style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 6px 0;">
                    <button type="button" id="mobile-logout-btn" style="display: block; width: 100%; text-align: left; background: none; border: none; padding: 10px 0; color: #FF4B4B; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.95rem;">로그아웃</button>
                    <a href="${prefix}account/index.html" style="display: block; padding: 10px 0; color: #8A919E; text-decoration: none; font-size: 0.95rem;">계정</a>
                `;
            }

            const handleLogoutAction = async (e) => {
                e.preventDefault();
                try {
                    await signOut(auth);
                    localStorage.removeItem("planit-token");
                    window.location.reload();
                } catch (err) {
                    console.error("Logout runtime failure:", err);
                }
            };

            document.getElementById('desktop-logout-btn')?.addEventListener('click', handleLogoutAction);
            document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogoutAction);

        } else {
            if (mobileAuthText) mobileAuthText.innerText = ""; 
            
            if (authMenuList) {
                authMenuList.innerHTML = `
                    <li class="menu-status" style="padding: 10px 16px; color: #8A919E; font-size: 0.85rem;">로그인이 필요합니다</li>
                    <hr class="divider" style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 6px 0;">
                    <li><a href="${prefix}login/index.html">로그인</a></li>
                    <li><a href="${prefix}registar/index.html">회원가입</a></li>
                `;
            }

            if (mobileSidebarAuthWrapper) {
                mobileSidebarAuthWrapper.innerHTML = `
                    <a href="${prefix}login/index.html" class="s-link" style="display: block; padding: 12px 0; color: #ffffff; font-weight: 600; text-decoration: none;">로그인</a>
                    <a href="${prefix}registar/index.html" class="s-link primary-accent" style="display: block; padding: 12px 0; color: #00F0FF; font-weight: 600; text-decoration: none;">회원가입</a>
                `;
            }
        }
    };

    onAuthStateChanged(auth, (user) => {
        renderAuthSystem(user);
    });
});