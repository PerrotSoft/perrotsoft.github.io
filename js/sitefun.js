function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

load();

function load() {
    const name = getCookie('name');
    const email = decodeURIComponent(getCookie('email'));
    const pcoin = "Pcoin " + getCookie('p-coin');
    const icon = decodeURIComponent(getCookie('icon')) || "https://cdn-icons-png.flaticon.com/128/17807/17807725.png";

    document.querySelector('div[class="name"]').innerText = name || "No Name";
    document.querySelector('div[class="email"]').innerText = email || "No Email";
    document.querySelector('div[class="pcoin"]').innerText = pcoin || "Pcoin 0";
    document.querySelector('img[class="user-icn"]').src = icon;
}

// Добавляем функции в глобальную область
window.toggleUserMenu = function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    if (menu) {
        const currentDisplay = window.getComputedStyle(menu).display;
        menu.style.display = currentDisplay === 'block' ? 'none' : 'block';
    }
};

window.openApp = function openApp(link) {
    window.location.href = link; // Переход на указанный URL
};

window.toggleMenu = function toggleMenu() {
    const menuContainer = document.getElementById('menuContainer');
    menuContainer.classList.toggle('open'); // Переключить класс open
};
function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000*5000)); // 1 год
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/";
}
