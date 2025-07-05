import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, '../../data/rooms.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Initialize database schema
const initDatabase = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Rooms table
            db.run(`
                CREATE TABLE IF NOT EXISTS rooms (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    language TEXT NOT NULL,
                    creator_id TEXT NOT NULL,
                    container_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    max_users INTEGER DEFAULT 10,
                    resource_tier TEXT DEFAULT 'medium'
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Room users (access control)
            db.run(`
                CREATE TABLE IF NOT EXISTS room_users (
                    room_id TEXT,
                    user_id TEXT,
                    role TEXT DEFAULT 'participant', -- 'owner', 'admin', 'participant'
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (room_id, user_id),
                    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Room languages table (for multi-language support)
            db.run(`
                CREATE TABLE IF NOT EXISTS room_languages (
                    room_id TEXT,
                    language TEXT,
                    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (room_id, language),
                    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Room files table (for file management)
            db.run(`
                CREATE TABLE IF NOT EXISTS room_files (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    content TEXT,
                    created_by TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Sessions table (both solo and room sessions)
            db.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    language TEXT NOT NULL,
                    session_type TEXT NOT NULL, -- 'solo' or 'room'
                    room_id TEXT, -- NULL for solo sessions
                    container_id TEXT,
                    websocket_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    resource_tier TEXT DEFAULT 'low',
                    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
};

// Database helper functions
export const dbHelpers = {
    // Room management
    createRoom: (roomData: {
        id: string;
        name: string;
        language: string;
        creator_id: string;
        expires_at: string;
        max_users?: number;
        resource_tier?: string;
    }): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO rooms (id, name, language, creator_id, expires_at, max_users, resource_tier)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run([
                roomData.id,
                roomData.name,
                roomData.language,
                roomData.creator_id,
                roomData.expires_at,
                roomData.max_users || 10,
                roomData.resource_tier || 'medium'
            ], function(err) {
                stmt.finalize();
                if (err) reject(err);
                else resolve();
            });
        });
    },

    getRoomById: (roomId: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM rooms WHERE id = ? AND is_active = 1', [roomId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateRoomContainer: (roomId: string, containerId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE rooms SET container_id = ? WHERE id = ?', [containerId, roomId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    deactivateRoom: (roomId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE rooms SET is_active = 0 WHERE id = ?', [roomId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    // Room users management
    addUserToRoom: (roomId: string, userId: string, role: string = 'participant'): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO room_users (room_id, user_id, role, last_active)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run([roomId, userId, role], function(err) {
                stmt.finalize();
                if (err) reject(err);
                else resolve();
            });
        });
    },

    getRoomUsers: (roomId: string): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM room_users WHERE room_id = ?', [roomId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    },

    checkUserRoomAccess: (roomId: string, userId: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM room_users WHERE room_id = ? AND user_id = ?', [roomId, userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    // Session management
    createSession: (sessionData: {
        id: string;
        user_id: string;
        language: string;
        session_type: string;
        room_id?: string;
        expires_at: string;
        resource_tier?: string;
    }): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT INTO sessions (id, user_id, language, session_type, room_id, expires_at, resource_tier)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run([
                sessionData.id,
                sessionData.user_id,
                sessionData.language,
                sessionData.session_type,
                sessionData.room_id || null,
                sessionData.expires_at,
                sessionData.resource_tier || 'low'
            ], function(err) {
                stmt.finalize();
                if (err) reject(err);
                else resolve();
            });
        });
    },

    getSessionById: (sessionId: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM sessions WHERE id = ? AND is_active = 1', [sessionId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateSessionContainer: (sessionId: string, containerId: string, websocketId?: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const query = websocketId 
                ? 'UPDATE sessions SET container_id = ?, websocket_id = ? WHERE id = ?'
                : 'UPDATE sessions SET container_id = ? WHERE id = ?';
            const params = websocketId ? [containerId, websocketId, sessionId] : [containerId, sessionId];
            
            db.run(query, params, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    deactivateSession: (sessionId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE sessions SET is_active = 0 WHERE id = ?', [sessionId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    getUserActiveSessions: (userId: string): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM sessions WHERE user_id = ? AND is_active = 1', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    },

    cleanExpiredSessions: (): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE sessions SET is_active = 0 WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    cleanExpiredRooms: (): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run('UPDATE rooms SET is_active = 0 WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    getExpiredSessions: (): Promise<Array<{id: string, container_id: string, session_type: string}>> => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, container_id, session_type FROM sessions WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1 AND container_id IS NOT NULL',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as Array<{id: string, container_id: string, session_type: string}>);
                }
            );
        });
    },

    getExpiredRooms: (): Promise<Array<{id: string, container_id: string}>> => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, container_id FROM rooms WHERE expires_at < CURRENT_TIMESTAMP AND is_active = 1 AND container_id IS NOT NULL',
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as Array<{id: string, container_id: string}>);
                }
            );
        });
    },

    getSoloSessionsNearExpiration: (cutoffTime: string): Promise<Array<{id: string, container_id: string}>> => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, container_id FROM sessions WHERE session_type = "solo" AND expires_at < ? AND is_active = 1 AND container_id IS NOT NULL',
                [cutoffTime],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows as Array<{id: string, container_id: string}>);
                }
            );
        });
    },

    // Room languages management
    addLanguagesToRoom: (roomId: string, languages: string[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT OR IGNORE INTO room_languages (room_id, language)
                VALUES (?, ?)
            `);
            
            db.serialize(() => {
                languages.forEach(language => {
                    stmt.run([roomId, language], (err) => {
                        if (err) console.error('Error adding language to room:', err);
                    });
                });
                stmt.finalize((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    },

    getRoomLanguages: (roomId: string): Promise<string[]> => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT language FROM room_languages WHERE room_id = ?
            `, [roomId], (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.language));
            });
        });
    },

    removeLanguageFromRoom: (roomId: string, language: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM room_languages WHERE room_id = ? AND language = ?
            `, [roomId, language], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    // Room files management
    saveRoomFile: (fileData: {
        id: string;
        room_id: string;
        file_path: string;
        file_name: string;
        content: string;
        created_by: string;
    }): Promise<void> => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO room_files 
                (id, room_id, file_path, file_name, content, created_by, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run([
                fileData.id,
                fileData.room_id,
                fileData.file_path,
                fileData.file_name,
                fileData.content,
                fileData.created_by
            ], function(err) {
                stmt.finalize();
                if (err) reject(err);
                else resolve();
            });
        });
    },

    getRoomFiles: (roomId: string): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM room_files 
                WHERE room_id = ? 
                ORDER BY file_path, file_name
            `, [roomId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    deleteRoomFile: (roomId: string, fileId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.run(`
                DELETE FROM room_files 
                WHERE room_id = ? AND id = ?
            `, [roomId, fileId], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    },

    // Enhanced room management
    updateRoomLanguages: (roomId: string, languages: string[]): Promise<void> => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                // Clear existing languages
                db.run(`DELETE FROM room_languages WHERE room_id = ?`, [roomId], (err) => {
                    if (err) reject(err);
                    else {
                        // Add new languages
                        const stmt = db.prepare(`
                            INSERT INTO room_languages (room_id, language)
                            VALUES (?, ?)
                        `);
                        
                        languages.forEach(language => {
                            stmt.run([roomId, language]);
                        });
                        
                        stmt.finalize((err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    }
                });
            });
        });
    }
}

export { db, initDatabase };
