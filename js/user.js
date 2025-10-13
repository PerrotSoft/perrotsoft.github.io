let url = "https://script.google.com/macros/s/AKfycbw8CBDh5G5eIFfTuPLUMGZze2KUGfR2lMyszdcsmKZ87F0W_09R9Mb-IW-nW00jV1Q1HQ/exec?action=";
function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000*5000)); // 1 год
    const expires = "; expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value || "") + expires + "; path=/";
}

// Функция для чтения данных из ячейки
async function readCell(cellAddress) {
    try {
        const response = await fetch(`${url}readCell&cellAddress=${cellAddress}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.value; // Возвращаем значение ячейки
    } catch (error) {
        console.error("Ошибка при чтении ячейки:", error);
        return null;
    }
}
async function readColumn(columnLetter) {
    try {
        const response = await fetch(`${url}readColumn&cellAddress=${columnLetter}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error("Ошибка при чтении столбца:", error);
        return null;
    }
}

// Функция для записи данных в ячейку
async function writeCell(cellAddress, value) {
    try {
        const response = await fetch(`${url}writeCell&cellAddress=${cellAddress}&value=${encodeURIComponent(value)}`);
        const data = await response.json();
        if (data.success) {
            console.log("Данные успешно записаны в ячейку.");
        } else {
            console.error("Ошибка при записи данных:", data.message);
        }
    } catch (error) {
        console.error("Ошибка при записи в ячейку:", error);
    }
}
async function hashMessage(message) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}  


// Получение cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Получение ID пользователя
async function userID(name) {
    try {
        const response = await fetch(`${url}searchUser&cellAddress=${name}`);
        const data = await response.json();
        return data.value; // Возвращаем ID пользователя
    } catch (error) {
        console.error("Ошибка при получении ID пользователя:", error);
        return null;
    }
}

// Добавление денег пользователю
async function addmoney(name, money) {
    try {
        const id = await userID(name);
        if (!id) throw new Error("ID пользователя не найден.");
        const currentMoney = parseFloat(await readCell('D' + id)) || 0;
        const newMoney = currentMoney + money;
        await writeCell('D' + id, newMoney);
        return newMoney;
    } catch (error) {
        console.error("Ошибка при добавлении денег:", error);
        return null;
    }
}

// Исправленная функция getmoney
async function getmoney(name) {
    try {
        const id = await userID(name); // Ожидаем результат userID
        if (!id) throw new Error("ID пользователя не найден.");
        const money = parseFloat(await readCell('D' + id)); // Ожидаем результат readCell
        if (isNaN(money)) throw new Error("Некорректное значение денег в ячейке.");
        return money; // Возвращаем корректное значение
    } catch (error) {
        console.error("Ошибка при получении денег:", error);
        return 0; // Возвращаем 0 в случае ошибки
    }
}

// Исправленная функция waitForMoney
async function waitForMoney(name) {
    return new Promise((resolve) => {
        const interval = setInterval(async () => {
            const money = await getmoney(name); // Ожидаем результат getmoney
            if (money > -1) {
                clearInterval(interval);
                resolve(money);
            }
        }, 100); // проверка каждые 100 мс
    });
}