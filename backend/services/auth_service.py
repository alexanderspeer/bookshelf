import os
import bcrypt
import secrets
import re
from datetime import datetime, timedelta
from database.db import get_db

# Reserved usernames that cannot be used
RESERVED_USERNAMES = {'me', 'u', 'api', 'auth', 'admin', 'static', 'assets'}


class AuthService:
    def __init__(self):
        self.db = get_db()
        # Session store (in-memory for now, consider Redis for production)
        self.sessions = {}
        self.session_expiry = timedelta(days=30)
    
    def validate_username(self, username: str) -> tuple[bool, str]:
        """Validate username format. Returns (is_valid, error_message)"""
        if not username:
            return False, 'Username is required'
        
        username = username.lower().strip()
        
        if len(username) < 3:
            return False, 'Username must be at least 3 characters'
        
        if len(username) > 24:
            return False, 'Username must be at most 24 characters'
        
        if not re.match(r'^[a-z0-9_]+$', username):
            return False, 'Username can only contain lowercase letters, numbers, and underscores'
        
        if username in RESERVED_USERNAMES:
            return False, 'This username is reserved'
        
        return True, ''
    
    def is_username_available(self, username: str) -> bool:
        """Check if username is available"""
        username = username.lower().strip()
        existing = self.db.execute_query(
            'SELECT id FROM users WHERE username = ?',
            (username,)
        )
        return not existing
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def create_user(self, email: str, password: str, username: str = None) -> dict:
        """Create a new user with hashed password and username"""
        # Normalize email to lowercase
        email = email.lower().strip()
        
        # Validate email format
        if not email or '@' not in email:
            raise ValueError('Invalid email format')
        
        # Validate password strength
        if not password or len(password) < 8:
            raise ValueError('Password must be at least 8 characters')
        
        # Validate and normalize username
        if username:
            username = username.lower().strip()
            is_valid, error_msg = self.validate_username(username)
            if not is_valid:
                raise ValueError(error_msg)
            
            # Check if username is available
            if not self.is_username_available(username):
                raise ValueError('Username is already taken')
        else:
            # Generate username from email if not provided
            username = self._generate_username_from_email(email)
        
        # Check if user already exists
        existing = self.db.execute_query(
            'SELECT id FROM users WHERE email = ?',
            (email,)
        )
        if existing:
            raise ValueError('User with this email already exists')
        
        # Hash password and create user
        password_hash = self.hash_password(password)
        user_id = self.db.execute_update(
            'INSERT INTO users (email, password_hash, username, is_public) VALUES (?, ?, ?, ?)',
            (email, password_hash, username, True)
        )
        
        return {
            'id': user_id,
            'email': email,
            'username': username,
            'created_at': datetime.utcnow().isoformat()
        }
    
    def _generate_username_from_email(self, email: str) -> str:
        """Generate a unique username from email local-part"""
        # Extract local part (before @)
        local_part = email.split('@')[0] if '@' in email else email
        
        # Normalize: only allow alphanumeric and underscore
        base = re.sub(r'[^a-z0-9_]', '', local_part.lower())
        
        # If invalid or reserved, use 'user' as base
        if not base or base in RESERVED_USERNAMES:
            is_valid, _ = self.validate_username(base)
            if not is_valid:
                base = 'user'
        
        # Ensure minimum length
        if len(base) < 3:
            base = 'user'
        
        # Check if base is available
        if self.is_username_available(base):
            return base
        
        # Try base2, base3, etc.
        counter = 2
        while counter < 1000:  # Safety limit
            candidate = f"{base}{counter}"
            if self.is_username_available(candidate):
                return candidate
            counter += 1
        
        # Fallback: use base + timestamp
        import time
        return f"{base}{int(time.time())}"
    
    def login(self, email: str, password: str) -> dict:
        """Authenticate user and create session"""
        # Normalize email
        email = email.lower().strip()
        
        print(f"[AUTH] Looking up user: {email}")
        
        # Find user
        users = self.db.execute_query(
            'SELECT id, email, password_hash FROM users WHERE email = ?',
            (email,)
        )
        
        if not users:
            print(f"[AUTH] User not found: {email}")
            raise ValueError('Invalid email or password')
        
        user = users[0]
        print(f"[AUTH] User found, ID: {user['id']}")
        print(f"[AUTH] Password hash in DB: {user['password_hash'][:20]}...")
        print(f"[AUTH] Password provided length: {len(password)}")
        
        # Verify password
        try:
            is_valid = self.verify_password(password, user['password_hash'])
            print(f"[AUTH] Password verification result: {is_valid}")
            if not is_valid:
                raise ValueError('Invalid email or password')
        except Exception as e:
            print(f"[AUTH] Password verification error: {e}")
            raise ValueError('Invalid email or password')
        
        # Create session token
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + self.session_expiry
        
        # Get username for session
        user_with_username = self.db.execute_query(
            'SELECT id, email, username FROM users WHERE id = ?',
            (user['id'],)
        )
        username = user_with_username[0].get('username') if user_with_username else None
        
        self.sessions[session_token] = {
            'user_id': user['id'],
            'email': user['email'],
            'username': username,
            'expires_at': expires_at
        }
        
        return {
            'user_id': user['id'],
            'email': user['email'],
            'username': username,
            'session_token': session_token
        }
    
    def logout(self, session_token: str) -> bool:
        """Invalidate a session"""
        if session_token in self.sessions:
            del self.sessions[session_token]
            return True
        return False
    
    def get_current_user(self, session_token: str) -> dict | None:
        """Get user from session token"""
        if not session_token:
            return None
        
        session = self.sessions.get(session_token)
        if not session:
            return None
        
        # Check if session is expired
        if datetime.utcnow() > session['expires_at']:
            del self.sessions[session_token]
            return None
        
        return {
            'id': session['user_id'],
            'email': session['email'],
            'username': session.get('username')
        }
    
    def get_user_by_id(self, user_id: int) -> dict | None:
        """Get user by ID"""
        users = self.db.execute_query(
            'SELECT id, email, username, is_public, created_at FROM users WHERE id = ?',
            (user_id,)
        )
        return users[0] if users else None
    
    def get_user_by_email(self, email: str) -> dict | None:
        """Get user by email"""
        email = email.lower().strip()
        users = self.db.execute_query(
            'SELECT id, email, username, is_public, created_at FROM users WHERE email = ?',
            (email,)
        )
        return users[0] if users else None
    
    def get_user_by_username(self, username: str) -> dict | None:
        """Get user by username"""
        username = username.lower().strip()
        users = self.db.execute_query(
            'SELECT id, email, username, is_public, created_at FROM users WHERE username = ?',
            (username,)
        )
        return users[0] if users else None
    
    def update_user_settings(self, user_id: int, is_public: bool = None) -> dict | None:
        """Update user settings"""
        updates = []
        params = []
        
        if is_public is not None:
            updates.append('is_public = ?')
            params.append(is_public)
        
        if not updates:
            return self.get_user_by_id(user_id)
        
        params.append(user_id)
        query = f'UPDATE users SET {", ".join(updates)} WHERE id = ?'
        self.db.execute_update(query, tuple(params))
        
        return self.get_user_by_id(user_id)
    
    def get_owner_user_id(self) -> int | None:
        """Get the owner user ID from OWNER_EMAIL env var"""
        owner_email = os.getenv('OWNER_EMAIL')
        if not owner_email:
            return None
        
        user = self.get_user_by_email(owner_email)
        return user['id'] if user else None


# Singleton instance
_auth_service = None

def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service

