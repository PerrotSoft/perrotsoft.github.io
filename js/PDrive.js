import "./firebase_db.js";

class PDrive {
    name = "";
    root = {};
    count_files_max = 100;

    constructor(name) {
        this.name = name;
    }

    async init() {
        let data = await window.dbManager.get("users/" + this.name);
        data = data?.value;

        if (!data?.PDrive) {
            data = {
                PDrive: {
                    size: 100,
                    root: { type: "folder", children: {} }
                }
            };
            await window.dbManager.editValue("users/" + this.name, { value: data });
        }

        if (!data.PDrive.root || data.PDrive.root.type !== "folder") {
            data.PDrive.root = { type: "folder", children: {} };
            await window.dbManager.editValue("users/" + this.name, { value: data });
        }

        this.count_files_max = data.PDrive.size;
        this.root = data.PDrive.root;
        return this;
    }


    _resolvePath(path) {
        if (!path.startsWith("/")) throw new Error("Path must start with /");
        return path.split("/").filter(Boolean);
    }

    _getNode(pathParts, createIfMissing = false, createType = "folder") {
        let node = this.root;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!node.children) node.children = {};
            if (!node.children[part]) {
                if (createIfMissing) {
                    node.children[part] = {
                        type: i === pathParts.length - 1 ? createType : "folder",
                        ...(createType === "folder" ? { children: {} } : {})
                    };
                } else {
                    return null;
                }
            }
            node = node.children[part];
        }
        return node;
    }

    async _save() {
        const rootCopy = JSON.parse(JSON.stringify(this.root));
        await window.dbManager.editValue('users/'+this.name, { "PDrive/root": rootCopy });
    }

    async mkdir(path) {
        const parts = this._resolvePath(path);
        this._getNode(parts, true, "folder");
        await this._save();
        return true;
    }

    async writeFile(path, data) {
        const parts = this._resolvePath(path);
        const filename = parts.pop();
        const folder = this._getNode(parts, true, "folder");
        folder.children[filename] = { type: "file", value: data };
        await this._save();
        return true;
    }

    async readFile(path) {
        const file = this._getNode(this._resolvePath(path));
        if (!file || file.type !== "file") throw new Error("File not found");
        return file.value;
    }

    async delete(path) {
        const parts = this._resolvePath(path);
        const name = parts.pop();
        const parent = this._getNode(parts);
        if (!parent || !parent.children[name]) throw console.error("Path not found");
        delete parent.children[name];
        await this._save();
        return true;
    }

    async rename(oldPath, newPath) {
        const oldParts = this._resolvePath(oldPath);
        const newParts = this._resolvePath(newPath);
        const nameOld = oldParts.pop();
        const nameNew = newParts.pop();
        const parentOld = this._getNode(oldParts);
        const parentNew = this._getNode(newParts, true, "folder");

        if (!parentOld || !parentOld.children[nameOld]) throw new Error("Old path not found");
        parentNew.children[nameNew] = parentOld.children[nameOld];
        delete parentOld.children[nameOld];
        await this._save();
        return true;
    }

    async listDir(path = "/") {
        const parts = this._resolvePath(path);
        const node = parts.length === 0 ? this.root : this._getNode(parts);

        if (!node) throw Error("Path not found");
        if (node.type !== "folder") throw new Error("Path is not a folder");

        // Если children нет, создаём пустой объект
        if (!node.children) node.children = {};

        return Object.keys(node.children).map(name => ({
            name,
            type: node.children[name].type
        }));
    }

    // ✅ ДОБАВЛЕННЫЙ МЕТОД: Рекурсивный обход и сбор всех файлов
    _searchFilesRecursive(node, currentPath = "/") {
        let foundFiles = [];

        // Убедимся, что у папки есть children
        if (node.type === "folder" && node.children) {
            
            for (const name in node.children) {
                const child = node.children[name];
                // Строим полный путь для текущего элемента
                // Убеждаемся, что не добавляем двойной слеш, если currentPath уже заканчивается на '/'
                const fullPath = currentPath + name;
                
                if (child.type === "file") {
                    // Нашли файл, добавляем его полную информацию
                    foundFiles.push({
                        name: name,
                        path: fullPath, // Полный путь
                        type: "file",
                        value: child.value // Содержимое файла
                    });
                } else if (child.type === "folder") {
                    // Рекурсивный вызов для подпапки, добавляем слеш в конце пути для папок
                    foundFiles = foundFiles.concat(this._searchFilesRecursive(child, fullPath + "/"));
                }
            }
        }
        return foundFiles;
    }

    async progect_sys_PS() {
        let info = [];

        // Предполагается, что dbManager.list("users") возвращает 
        // массив объектов вида: [{ key: "имя_пользователя", value: {...} }, ...]
        const userEntries = await window.dbManager.list("users");
        
        for (const entry of userEntries) {
            // Исправлена логика получения имени пользователя, как обсуждалось ранее
            const username = entry.key || entry.name; 
            
            if (!username) continue; 
            
            try {
                // Создаем новый экземпляр PDrive для каждого пользователя
                const pdrive = new PDrive(username);
                await pdrive.init();
                
                // ✅ ИСПОЛЬЗУЕМ рекурсивный поиск по всему диску
                // Начинаем поиск с корня (pdrive.root)
                const allFiles = pdrive._searchFilesRecursive(pdrive.root);
                
                for (const fileData of allFiles) {
                    // Добавляем информацию о файле и его содержимое
                    info.push({
                        username: username,
                        file: {
                            name: fileData.name,
                            path: fileData.path, // Полный путь
                            type: fileData.type,
                            value: fileData.value
                        }
                    });
                    console.log(`PDrive for user ${username} added file: ${fileData.path}`);
                }
            } catch (e) {
                console.warn(`Could not process user ${username}:`, e.message);
            }
        }

        return info;
    }

    async get_progect_files(filetype) {
        // Вызываем progect_sys_PS, чтобы получить уже обработанный список со всем содержимым
        const info = await this.progect_sys_PS(); 
        console.log("Collected file info from all users:", info);
        let files = [];

        for (const userEntry of info) {
            const file = userEntry.file;
            // Проверяем, заканчивается ли имя файла на искомое расширение (например, ".ppsearch")
            if (file.type === "file" && file.name.endsWith(filetype)) {
                files.push({
                    user: userEntry.username,
                    file: file // file содержит name, path, type и value
                });
                console.log(`Matched project file: ${file.name} at ${file.path} for user: ${userEntry.username}`);
            }
        }

        return files;
    }
}


export { PDrive };