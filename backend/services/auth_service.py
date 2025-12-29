import os
import bcrypt
import secrets
from datetime import datetime, timedelta
from database.db import get_db


class AuthService:
    def __init__(self):
        self.db = get_db()
        # Session store (in-memory for now, consider Redis for production)
        self.sessions = {}
        self.session_expiry = timedelta(days=30)
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def create_user(self, email: str, password: str) -> dict:
        """Create a new user with hashed password"""
        # Normalize email to lowercase
        email = email.lower().strip()
        
        # Validate email format
        if not email or '@' not in email:
            raise ValueError('Invalid email format')
        
        # Validate password strength
        if not password or len(password) < 8:
            raise ValueError('Password must be at least 8 characters')
        
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
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            (email, password_hash)
        )
        
        return {
            'id': user_id,
            'email': email,
            'created_at': datetime.utcnow().isoformat()
        }
    
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
        
        self.sessions[session_token] = {
            'user_id': user['id'],
            'email': user['email'],
            'expires_at': expires_at
        }
        
        return {
            'user_id': user['id'],
            'email': user['email'],
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
            'email': session['email']
        }
    
    def get_user_by_id(self, user_id: int) -> dict | None:
        """Get user by ID"""
        users = self.db.execute_query(
            'SELECT id, email, created_at FROM users WHERE id = ?',
            (user_id,)
        )
        return users[0] if users else None
    
    def get_user_by_email(self, email: str) -> dict | None:
        """Get user by email"""
        email = email.lower().strip()
        users = self.db.execute_query(
            'SELECT id, email, created_at FROM users WHERE email = ?',
            (email,)
        )
        return users[0] if users else None
    
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

