const fs = require('fs');
const path = require('path');

class JsonDatabase {
    constructor(dbName) {
        this.dbPath = path.join(__dirname, `${dbName}.json`);
        if (!fs.existsSync(this.dbPath)) {
            this.createDb();
        }
    }

    createDb() {
        // Создание новой базы данных  
        fs.writeFileSync(this.dbPath, JSON.stringify({}, null, 2));
    }

    insert(key, value) {
        // Вставка значения в базу данных  
        const data = this._readData();
        data[key] = value;
        this._writeData(data);
    }

    get(key) {
        // Получение значения по ключу  
        const data = this._readData();
        return data[key] || null;
    }

    update(key, value) {
        // Обновление значения по ключу  
        this.insert(key, value);
    }

    delete(key) {
        // Удаление значения по ключу  
        const data = this._readData();
        delete data[key];
        this._writeData(data);
    }

    _readData() {
        // Чтение данных из файла  
        const rawData = fs.readFileSync(this.dbPath);
        return JSON.parse(rawData);
    }

    _writeData(data) {
        // Запись данных в файл  
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    }
}

// Пример использования  
const db = new JsonDatabase('my_database');

// Вставка данных  
db.insert('name', 'Alice');
console.log(db.get('name'));  // Вывод: Alice  

// Обновление данных  
db.update('name', 'Bob');
console.log(db.get('name'));  // Вывод: Bob  

// Удаление данных  
db.delete('name');
console.log(db.get('name'));  // Вывод: null