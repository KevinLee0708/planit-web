document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const accordionTrigger = document.querySelector('.accordion-trigger');
    const accordionContent = document.querySelector('.accordion-content');

    const toggleMenu = (isOpen) => {
        sidebar.classList.toggle('active', isOpen);
        overlay.classList.toggle('active', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    };

    menuToggle.addEventListener('click', () => toggleMenu(true));
    menuClose.addEventListener('click', () => toggleMenu(false));
    overlay.addEventListener('click', () => toggleMenu(false));

    accordionTrigger.addEventListener('click', () => {
        accordionContent.classList.toggle('open');
    });

    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        navbar.style.background = window.scrollY > 50 ? 'rgba(0, 0, 0, 0.9)' : 'var(--glass)';
    });
});