import { openDB, DBSchema } from 'idb';

interface BoardGameDB extends DBSchema {
  files: {
    key: string;
    value: {
      id: string;
      file: Blob;
      timestamp: number;
    };
  };
  messages: {
    key: string; // gameId
    value: {
      gameId: string;
      messages: any[]; // ChatMessage[]
    };
  };
  audio: {
    key: string; // messageId
    value: {
      id: string;
      blob: Blob;
    };
  };
}

const DB_NAME = 'board-game-teacher-db';
const DB_VERSION = 2; // Increment version

export const initDB = async () => {
  return openDB<BoardGameDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'gameId' });
      }
      if (!db.objectStoreNames.contains('audio')) {
        db.createObjectStore('audio', { keyPath: 'id' });
      }
    },
  });
};

export const saveFile = async (id: string, file: Blob) => {
  const db = await initDB();
  await db.put('files', {
    id,
    file,
    timestamp: Date.now(),
  });
};

export const getFile = async (id: string): Promise<Blob | undefined> => {
  const db = await initDB();
  const result = await db.get('files', id);
  return result?.file;
};

export const deleteFile = async (id: string) => {
  const db = await initDB();
  await db.delete('files', id);
};

// Chat Messages
export const saveMessages = async (gameId: string, messages: any[]) => {
  const db = await initDB();
  // Don't store ephemeral properties like isAudioPlaying or volatile URLs
  const cleanMessages = messages.map(m => {
    const { isAudioPlaying, isAudioGenerating, audioUrl, ...rest } = m;
    // We keep a flag if audio exists (either already had it, or just generated it)
    return { ...rest, hasAudio: m.hasAudio || !!audioUrl };
  });
  
  await db.put('messages', {
    gameId,
    messages: cleanMessages
  });
};

export const getMessages = async (gameId: string) => {
  const db = await initDB();
  const result = await db.get('messages', gameId);
  return result?.messages || [];
};

export const deleteMessages = async (gameId: string) => {
  const db = await initDB();
  await db.delete('messages', gameId);
};

export const deleteGameData = async (gameId: string) => {
  const db = await initDB();
  // Delete file
  await db.delete('files', gameId);
  // Delete messages
  await db.delete('messages', gameId);
  // Note: Audio blobs associated with messages are not currently garbage collected
  // to avoid complex dependency tracking, but could be added later.
};

// Audio Blobs
export const saveAudio = async (messageId: string, blob: Blob) => {
  const db = await initDB();
  await db.put('audio', {
    id: messageId,
    blob
  });
};

export const getAudio = async (messageId: string): Promise<Blob | undefined> => {
  const db = await initDB();
  const result = await db.get('audio', messageId);
  return result?.blob;
};
