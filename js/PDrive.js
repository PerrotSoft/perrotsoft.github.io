import "./firebase_db.js";

class PDrive {
    name = "";
    root = {};
    count_files_max = 100;
    
    // 🗃️ Константа для лимита размера файла (900 КБ для запаса)
    static FILE_SIZE_LIMIT = 921600; 
    // Название метаданных для хранения информации о частях
    static PART_INFO_KEY = '__file_parts'; 

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
        return path.split("/").filter(Boolean).map(p => decodeURIComponent(p));
    }

    _encodeKey(key) {
        return encodeURIComponent(key);
    }
    
    _getNode(pathParts, createIfMissing = false, createType = "folder") {
        let node = this.root;
        for (let i = 0; i < pathParts.length; i++) {
            const part = this._encodeKey(pathParts[i]); 
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
// ------------------------------------------------------------------
// 💾 ФУНКЦИИ ЧАНКОВАНИЯ (SPLIT/RECONSTRUCT)
// ------------------------------------------------------------------

    /**
     * Конвертирует любые входные данные в чистую Base64 строку и определяет их тип.
     */
    _toBase64String(data) {
        let base64 = '';
        let originalType = typeof data;
        let mimeType = null;
        
        if (typeof data === 'string') {
            originalType = 'string';
            if (data.startsWith('data:')) {
                originalType = 'dataurl';
                const parts = data.split(',');
                if (parts[0].includes(';base64')) {
                     mimeType = parts[0].substring(data.indexOf(':') + 1).split(';')[0];
                }
                base64 = parts[1] || '';
            } else {
                base64 = btoa(unescape(encodeURIComponent(data)));
            }
        } else if (data instanceof Uint8Array) {
            originalType = 'uint8array';
            base64 = btoa(String.fromCharCode(...data));
        } else if (data && typeof data.toString === 'function') {
            base64 = btoa(String(data));
        } else {
            base64 = btoa(JSON.stringify(data));
        }
        
        return { base64, originalType, mimeType };
    }
    
    /**
     * Декодирует Base64 строку обратно в исходный формат данных.
     */
    _decodeBase64BackToOriginal(base64Data, metadata) {
        const base64ToUint8Array = (base64) => {
             const raw = atob(base64);
             const array = new Uint8Array(raw.length);
             for (let i = 0; i < raw.length; i++) {
                 array[i] = raw.charCodeAt(i);
             }
             return array;
        };

        switch (metadata.originalType) {
            case 'dataurl':
                let prefix = `data:${metadata.mimeType || 'application/octet-stream'};base64,`;
                return prefix + base64Data;
            case 'uint8array':
                return base64ToUint8Array(base64Data);
            case 'string':
            default:
                try {
                    return decodeURIComponent(escape(atob(base64Data)));
                } catch (e) {
                    return base64Data; 
                }
        }
    }

    /**
     * Разбивает файл на части и сохраняет их.
     */
    async _splitFile(filename, folder, base64Data) {
        const limit = PDrive.FILE_SIZE_LIMIT;
        const totalParts = Math.ceil(base64Data.length / limit);
        if (totalParts === 0) return 0;

        for (let i = 0; i < totalParts; i++) {
            const chunk = base64Data.substring(i * limit, (i + 1) * limit);
            const partFilename = this._encodeKey(`${filename}_part${i}`);
            
            folder.children[partFilename] = { type: "file", value: chunk };
        }
        
        console.log(`File ${filename} split into ${totalParts} parts.`);
        return totalParts;
    }

    /**
     * Собирает части файла обратно и восстанавливает исходный формат.
     */
    async _reconstructFile(path, metadata) {
        const parts = this._resolvePath(path);
        const filename = parts.pop();
        const folder = this._getNode(parts);
        const partsCount = metadata.count;
        
        if (!folder) throw new Error("Parent folder not found during reconstruct.");

        let reconstructedBase64 = '';
        for (let i = 0; i < partsCount; i++) {
            const partFilenameEncoded = this._encodeKey(`${filename}_part${i}`);
            const partNode = folder.children[partFilenameEncoded];

            if (!partNode || partNode.type !== 'file') {
                 console.error(`Missing file part: ${filename}_part${i}. Reconstruction stopped.`);
                 throw new Error(`Missing file part: ${filename}_part${i}`);
            }
            reconstructedBase64 += partNode.value;
        }

        console.log(`File ${filename} reconstructed from ${partsCount} parts.`);
        
        return this._decodeBase64BackToOriginal(reconstructedBase64, metadata);
    }
    
    /**
     * Вспомогательный метод для удаления только частей файла.
     */
    _deleteFilePartsOnly(filename, parent, fileNode) {
        const partInfo = fileNode.value?.[PDrive.PART_INFO_KEY];
        
        if (partInfo && partInfo.count > 0) {
            for (let i = 0; i < partInfo.count; i++) {
                const partFilenameEncoded = this._encodeKey(`${filename}_part${i}`);
                delete parent.children[partFilenameEncoded];
            }
            console.log(`Deleted ${partInfo.count} parts for file: ${filename}`);
            return true;
        }
        return false;
    }

// ------------------------------------------------------------------
// 📂 ПУБЛИЧНЫЕ МЕТОДЫ 
// ------------------------------------------------------------------

    async writeFile(path, data) {
        const parts = this._resolvePath(path);
        const filename = parts.pop();
        const encodedFilename = this._encodeKey(filename);
        const folder = this._getNode(parts, true, "folder");
        
        const { base64: base64Data, originalType, mimeType } = this._toBase64String(data);
        
        const existingNode = folder.children[encodedFilename];
        if (existingNode) {
            this._deleteFilePartsOnly(filename, folder, existingNode);
        }

        if (base64Data.length > PDrive.FILE_SIZE_LIMIT) {
            const partsCount = await this._splitFile(filename, folder, base64Data);
            
            folder.children[encodedFilename] = { 
                type: "file", 
                value: { 
                    [PDrive.PART_INFO_KEY]: {
                        count: partsCount,
                        originalType: originalType,
                        mimeType: mimeType
                    }
                } 
            };
        } else {
            folder.children[encodedFilename] = { type: "file", value: data };
        }
        
        await this._save();
        return true;
    }

    async readFile(path) {
        const file = this._getNode(this._resolvePath(path));
        // ... (проверка на ошибку)

        const partInfo = file.value?.[PDrive.PART_INFO_KEY];

        if (partInfo && partInfo.count && partInfo.count > 0) {
            // ✅ Возвращает собранные и декодированные данные (string/Uint8Array)
            return await this._reconstructFile(path, partInfo);
        }

        // ❌ ВНИМАНИЕ: Если это одиночный файл, `file.value` должно быть либо строкой, 
        // либо массивом. Если вы случайно сохранили ОБЪЕКТ в `file.value` для маленьких файлов, 
        // будет возвращено "[object Object]".
        
        // Убедитесь, что file.value не является объектом метаданных
        if (typeof file.value === 'object' && file.value !== null && !Array.isArray(file.value)) {
            // Если это объект, это может быть ошибка или метаданные.
            // В идеале, эта ветка должна возвращать исходные данные.
            // Если вы ожидаете строку, примените конвертацию:
            // return String(file.value); 
            
            // Но в вашем коде file.value должно быть чистым контентом для одиночных файлов.
            return file.value;
        }
        
        return file.value;
    }
    
    async delete(path) {
        const parts = this._resolvePath(path);
        const name = parts.pop();
        const parent = this._getNode(parts);
        const encodedName = this._encodeKey(name);
        
        if (!parent || !parent.children[encodedName]) throw console.error("Path not found");
        
        const fileNode = parent.children[encodedName];
        
        this._deleteFilePartsOnly(name, parent, fileNode);
        
        delete parent.children[encodedName];
        
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
        
        const encodedNameOld = this._encodeKey(nameOld);
        const encodedNameNew = this._encodeKey(nameNew);

        if (!parentOld || !parentOld.children[encodedNameOld]) throw new Error("Old path not found");
        
        parentNew.children[encodedNameNew] = parentOld.children[encodedNameOld];
        delete parentOld.children[encodedNameOld];
        
        const fileNode = parentNew.children[encodedNameNew];
        const partInfo = fileNode.value?.[PDrive.PART_INFO_KEY];

        if (partInfo && partInfo.count > 0) {
             for (let i = 0; i < partInfo.count; i++) {
                const partFilenameOld = this._encodeKey(`${nameOld}_part${i}`);
                const partFilenameNew = this._encodeKey(`${nameNew}_part${i}`);
                
                if (parentOld.children[partFilenameOld]) {
                    parentNew.children[partFilenameNew] = parentOld.children[partFilenameOld];
                    delete parentOld.children[partFilenameOld];
                }
            }
            console.log(`Renamed and moved ${partInfo.count} parts for file: ${nameOld} -> ${nameNew}`);
        }
        
        await this._save();
        return true;
    }
    
    async listDir(path = "/") {
        const parts = this._resolvePath(path);
        const node = parts.length === 0 ? this.root : this._getNode(parts);

        if (!node) throw Error("Path not found");
        if (node.type !== "folder") throw new Error("Path is not a folder");

        if (!node.children) node.children = {};

        return Object.keys(node.children)
            .filter(encodedName => !encodedName.includes('_part'))
            .map(encodedName => {
                const name = decodeURIComponent(encodedName);
                return {
                    name,
                    type: node.children[encodedName].type
                };
            });
    }

    _searchFilesRecursive(node, currentPath = "/") {
        let foundFiles = [];

        if (node.type === "folder" && node.children) {
            
            for (const encodedName in node.children) {
                if (encodedName.includes('_part')) continue; 
                
                const child = node.children[encodedName];
                const name = decodeURIComponent(encodedName);
                const fullPath = currentPath + name;
                
                if (child.type === "file") {
                    foundFiles.push({
                        name: name,
                        path: fullPath, 
                        type: "file",
                        value: child.value 
                    });
                } else if (child.type === "folder") {
                    foundFiles = foundFiles.concat(this._searchFilesRecursive(child, fullPath + "/"));
                }
            }
        }
        return foundFiles;
    }

    async progect_sys_PS() {
        let info = [];
        const userEntries = await window.dbManager.list("users");
        
        for (const entry of userEntries) {
            const username = entry.key || entry.name; 
            if (!username) continue; 
            
            try {
                const pdrive = new PDrive(username);
                await pdrive.init();
                
                const allFiles = pdrive._searchFilesRecursive(pdrive.root);
                
                for (const fileData of allFiles) {
                    const fileContent = await pdrive.readFile(fileData.path); 

                    info.push({
                        username: username,
                        file: {
                            ...fileData,
                            value: fileContent 
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
        const info = await this.progect_sys_PS(); 
        console.log("Collected file info from all users:", info);
        let files = [];

        for (const userEntry of info) {
            const file = userEntry.file;
            
            if (file.type === "file" && file.name.endsWith(filetype)) {
                files.push({
                    user: userEntry.username,
                    file: file
                });
                console.log(`Matched project file: ${file.name} at ${file.path} for user: ${userEntry.username}`);
            }
        }

        return files;
    }
}


export { PDrive };