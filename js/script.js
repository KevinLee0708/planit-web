document.addEventListener('DOMContentLoaded', () => {
    // 1. 주요 요소 셀렉터 (HTML ID와 일치 확인)
    const toggle = document.getElementById('menu-toggle');
    const close = document.getElementById('menu-close');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('menu-overlay');
    const commTrigger = document.getElementById('mobile-comm-trigger');
    const commContent = document.getElementById('mobile-comm-content');

    /**
     * 2. 사이드바 열기/닫기 로직
     * @param {boolean} isOpen - 사이드바 상태
     */
    const handleMenu = (state) => {
        if (!sidebar || !overlay) return; // 에러 방지용 가드 클로즈
        
        sidebar.classList.toggle('active', state);
        overlay.classList.toggle('active', state);
        
        // 사이드바가 열려있을 때 뒷배경 스크롤 방지
        document.body.style.overflow = state ? 'hidden' : '';
    };

    // 이벤트 리스너 안전하게 등록
    toggle?.addEventListener('click', () => handleMenu(true));
    close?.addEventListener('click', () => handleMenu(false));
    overlay?.addEventListener('click', () => handleMenu(false));

    /**
     * 3. 모바일 커뮤니티 아코디언 (상태 아이콘 회전 포함)
     * CSS에서 .accordion-trigger.active .chevron { transform: rotate(90deg); } 가 필요합니다.
     */
    commTrigger?.addEventListener('click', () => {
        // active 클래스를 토글하여 화살표 방향 변경 (CSS 연동)
        const isActive = commTrigger.classList.toggle('active');
        
        if (isActive) {
            // 열기: 내부 높이를 측정하여 부드럽게 펼침
            commContent.style.maxHeight = commContent.scrollHeight + "px";
        } else {
            // 닫기
            commContent.style.maxHeight = "0";
        }
    });

    /**
     * 4. 데스크탑/모바일 공통 스크롤 효과
     * 상단에서 40px 이상 내려오면 네비바 디자인 변경
     */
    const globalNav = document.getElementById('global-nav');
    window.addEventListener('scroll', () => {
        if (!globalNav) return;

        if (window.scrollY > 40) {
            globalNav.style.width = '100%';
            globalNav.style.top = '0';
            globalNav.style.borderRadius = '0';
            globalNav.style.background = 'rgba(2, 4, 8, 0.98)';
        } else {
            globalNav.style.width = '92%';
            globalNav.style.top = '15px';
            globalNav.style.borderRadius = '20px';
            globalNav.style.background = 'rgba(10, 12, 18, 0.75)';
        }
    }, { passive: true });
});