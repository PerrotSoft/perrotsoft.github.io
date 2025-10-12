// firebase_db.js

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDjNbxx-wxJxxbnpfpIwVyAtJw2P-vEhkc",
  authDomain: "parrotsoft-89881.firebaseapp.com",
  projectId: "parrotsoft-89881",
  storageBucket: "parrotsoft-89881.firebasestorage.app",
  messagingSenderId: "431861262385",
  appId: "1:431861262385:web:973cebab402b1e5084cd10",
  measurementId: "G-5DYKXSRHH0"
};

// 1. Инициализация Firebase и Realtime Database
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(); 
console.log("Firebase Realtime Database (RTDB) инициализирована.");

// --- Вспомогательные функции ---

// Очищает путь, обрабатывая '/' или пустую строку как корень
function cleanPath(path) {
    if (!path || path === '/') return '';
    // Удаляем ведущие и замыкающие слэши
    return path.replace(/^\/|\/$/g, ''); 
}

// Преобразует путь и имя в полный путь RTDB
function getFullPath(basePath, keyName) {
    const cleanBase = cleanPath(basePath);
    const cleanKey = cleanPath(keyName);
    
    if (cleanBase === '') {
        return cleanKey; 
    } else if (cleanKey === '') {
        return cleanBase;
    } else {
        return `${cleanBase}/${cleanKey}`;
    }
}

/**
 * 2. Основные функции работы с ключами
 */

// --- 1. СОЗДАНИЕ КЛЮЧА (SET) ---
/**
 * Создает новый ключ (файл/папку) по указанному пути и имени, устанавливая значение.
 * @param {string} basePath Путь к родительскому ключу.
 * @param {string} keyName Имя нового ключа.
 * @param {any} value Значение (JSON-объект, строка, число и т.д.).
 */
async function createNewKey(basePath, keyName, value) {
  const fullPath = getFullPath(basePath, keyName);
  if (!fullPath) throw new Error("Необходимо указать имя ключа.");

  try {
    // .set() перезаписывает или создает узел
    await db.ref(fullPath).set(value);
    console.log(`[CREATE KEY] Успех. Ключ "${keyName}" создан/перезаписан.`);
  } catch (error) {
    console.error(`[CREATE KEY] Ошибка создания ключа: `, error);
    throw error;
  }
}

// --- 2. РЕДАКТИРОВАНИЕ ЗНАЧЕНИЯ (UPDATE) ---
/**
 * Обновляет поля в существующем объекте. 
 * Внимание: Это работает только если value является JSON-объектом.
 * @param {string} fullPath Полный путь к ключу для редактирования.
 * @param {object} updates Объект с обновляемыми полями.
 */
async function editKeyValue(fullPath, updates) {
    const cleanP = cleanPath(fullPath);
    if (!cleanP) throw new Error("Необходимо указать полный путь к ключу для редактирования.");

    // Проверка, что передается объект для .update()
    if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
        throw new Error("Для операции EDIT/UPDATE значение должно быть JSON-объектом (для обновления полей).");
    }

    try {
        // .update() обновляет только указанные поля
        await db.ref(cleanP).update(updates);
        console.log(`[EDIT VALUE] Успех. Поля ключа "${cleanP}" обновлены.`);
    } catch (error) {
        console.error(`[EDIT VALUE] Ошибка редактирования ключа: `, error);
        throw error;
    }
}

// --- 3. ЧТЕНИЕ СПИСКА ПОДКЛЮЧЕЙ (LIST) ---
/**
 * Получает список всех непосредственных дочерних ключей (подключей).
 */
async function listSubKeys(path) {
    const cleanP = cleanPath(path);

    try {
        const snapshot = await db.ref(cleanP).once('value');
        if (!snapshot.exists()) return [];

        const subKeys = [];
        const basePath = cleanP; 

        snapshot.forEach(childSnapshot => {
            subKeys.push({
                key: childSnapshot.key,
                fullPath: getFullPath(basePath, childSnapshot.key),
                isContainer: typeof childSnapshot.val() === 'object' && childSnapshot.val() !== null 
            });
        });
        
        console.log(`[LIST KEYS] Успех. Найдено ${subKeys.length} подключей.`);
        return subKeys;

    } catch (error) {
        console.error(`[LIST KEYS] Ошибка при чтении списка подключей: `, error);
        throw error;
    }
}

// --- 4. ЧТЕНИЕ ДАННЫХ КЛЮЧА (GET) ---
/**
 * Получает полное содержимое ключа по полному пути.
 */
async function getKeyData(fullPath) {
    const cleanP = cleanPath(fullPath);
    if (!cleanP) throw new Error("Необходимо указать полный путь для чтения.");

    try {
        const snapshot = await db.ref(cleanP).once('value');
        if (snapshot.exists()) {
             const data = snapshot.val();
             console.log(`[GET DATA] Успех. Данные ключа "${cleanP}" получены.`);
            return {
                key: cleanP.split('/').pop(),
                path: cleanP,
                value: data // Возвращаем чистое значение узла
            };
        }
        return null;
    } catch (error) {
        console.error(`[GET DATA] Ошибка чтения данных ключа: `, error);
        throw error;
    }
}

// --- 5. УДАЛЕНИЕ КЛЮЧА (DELETE) ---
/**
 * Удаляет ключ и все его дочерние элементы.
 * @param {string} fullPath Полный путь к ключу для удаления.
 */
async function deleteKey(fullPath) {
    const cleanP = cleanPath(fullPath);
    if (!cleanP) throw new Error("Необходимо указать полный путь к ключу для удаления.");

    try {
        await db.ref(cleanP).remove();
        console.log(`[DELETE KEY] Успех. Ключ "${cleanP}" удален.`);
    } catch (error) {
        console.error(`[DELETE KEY] Ошибка удаления ключа: `, error);
        throw error;
    }
}


// Экспортируем функции в глобальный объект для index.html
window.dbManager = {
    create: createNewKey,
    editValue: editKeyValue,
    list: listSubKeys,
    get: getKeyData,
    delete: deleteKey // Добавлена функция удаления
};