document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('menu-toggle');
    const close = document.getElementById('menu-close');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('menu-overlay');
    const commTrigger = document.getElementById('mobile-comm-trigger');
    const commContent = document.getElementById('mobile-comm-content');

    // 사이드바 토글
    const handleSidebar = (isOpen) => {
        sidebar.classList.toggle('active', isOpen);
        overlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    };

    toggle.addEventListener('click', () => handleSidebar(true));
    close.addEventListener('click', () => handleSidebar(false));
    overlay.addEventListener('click', () => handleSidebar(false));

    // 모바일 아코디언
    if (commTrigger) {
        commTrigger.addEventListener('click', () => {
            const active = commTrigger.classList.toggle('active');
            commContent.style.maxHeight = active ? commContent.scrollHeight + "px" : "0px";
        });
    }

    // 스크롤 시 네비바 스타일 변화
    window.addEventListener('scroll', () => {
        const nav = document.getElementById('global-nav');
        if (window.scrollY > 40) {
            nav.style.background = 'rgba(2, 4, 8, 0.95)';
            nav.style.width = '100%';
            nav.style.top = '0';
            nav.style.borderRadius = '0';
        } else {
            nav.style.background = 'var(--glass)';
            nav.style.width = '92%';
            nav.style.top = '15px';
            nav.style.borderRadius = '20px';
        }
    });
});