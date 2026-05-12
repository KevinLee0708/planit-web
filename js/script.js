document.addEventListener('DOMContentLoaded', () => {
    const mobileToggle = document.getElementById('mobile-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const accordionTrigger = document.querySelector('.accordion-trigger');
    const accordionBody = document.querySelector('.accordion-body');

    // 1. 사이드바 제어 (Body 스크롤 차단 포함)
    const toggleSidebar = (isOpen) => {
        sidebar.classList.toggle('active', isOpen);
        overlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    };

    mobileToggle.addEventListener('click', () => toggleSidebar(true));
    sidebarClose.addEventListener('click', () => toggleSidebar(false));
    overlay.addEventListener('click', () => toggleSidebar(false));

    // 2. 모바일 아코디언 (커뮤니티 메뉴)
    if (accordionTrigger) {
        accordionTrigger.addEventListener('click', () => {
            accordionBody.classList.toggle('open');
            accordionTrigger.classList.toggle('active');
        });
    }

    // 3. 스크롤 시 네비바 유리 효과 강화
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(2, 4, 8, 0.95)';
            navbar.style.top = '0';
            navbar.style.width = '100%';
            navbar.style.borderRadius = '0';
        } else {
            navbar.style.background = 'var(--glass)';
            navbar.style.top = '15px';
            navbar.style.width = '92%';
            navbar.style.borderRadius = '20px';
        }
    });
});