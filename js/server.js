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
        // �������� ����� ���� ������  
        fs.writeFileSync(this.dbPath, JSON.stringify({}, null, 2));
    }

    insert(key, value) {
        // ������� �������� � ���� ������  
        const data = this._readData();
        data[key] = value;
        this._writeData(data);
    }

    get(key) {
        // ��������� �������� �� �����  
        const data = this._readData();
        return data[key] || null;
    }

    update(key, value) {
        // ���������� �������� �� �����  
        this.insert(key, value);
    }

    delete(key) {
        // �������� �������� �� �����  
        const data = this._readData();
        delete data[key];
        this._writeData(data);
    }

    _readData() {
        // ������ ������ �� �����  
        const rawData = fs.readFileSync(this.dbPath);
        return JSON.parse(rawData);
    }

    _writeData(data) {
        // ������ ������ � ����  
        fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
    }
}

// ������ �������������  
const db = new JsonDatabase('my_database');

// ������� ������  
db.insert('name', 'Alice');
console.log(db.get('name'));  // �����: Alice  

// ���������� ������  
db.update('name', 'Bob');
console.log(db.get('name'));  // �����: Bob  

// �������� ������  
db.delete('name');
console.log(db.get('name'));  // �����: null