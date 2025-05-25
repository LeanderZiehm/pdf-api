class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.startCleanup();
  }

  create(data) {
    const sessionId = Date.now().toString();
    this.sessions.set(sessionId, {
      createdAt: Date.now(),
      ...data
    });
    return sessionId;
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  has(sessionId) {
    return this.sessions.has(sessionId);
  }

  update(sessionId, data) {
    if (this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        ...this.sessions.get(sessionId),
        ...data
      });
    }
  }

  delete(sessionId) {
    this.sessions.delete(sessionId);
  }

  startCleanup() {
    const config = require('../config');
    setInterval(() => {
      const cutoff = Date.now() - config.SESSION_TIMEOUT;
      
      this.sessions.forEach((session, sessionId) => {
        if (session.createdAt < cutoff) {
          this.cleanupSession(sessionId);
        }
      });
    }, config.SESSION_TIMEOUT);
  }

  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const fs = require('fs');
    
    // Clean up uploaded files
    if (session.files) {
      session.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    // Clean up merged file
    if (session.mergedFile && fs.existsSync(session.mergedFile.path)) {
      fs.unlinkSync(session.mergedFile.path);
    }
    
    this.sessions.delete(sessionId);
  }
}

module.exports = new SessionManager();
