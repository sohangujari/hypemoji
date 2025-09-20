from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import re
import secrets
import hashlib
from datetime import datetime
from typing import Dict, List, Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Enhanced Emoji Encryption API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define multiple emoji mapping sets for different security levels
EMOJI_SETS = {
    1: {
        # Face emojis for lowercase letters
        'a': '😀', 'b': '😃', 'c': '😄', 'd': '😁', 'e': '😆', 
        'f': '😅', 'g': '😂', 'h': '🤣', 'i': '😊', 'j': '😇',
        'k': '🙂', 'l': '🙃', 'm': '😉', 'n': '😌', 'o': '😍',
        'p': '🥰', 'q': '😘', 'r': '😗', 's': '😙', 't': '😚',
        'u': '😋', 'v': '😛', 'w': '😝', 'x': '😜', 'y': '🤪', 'z': '🤨',
        
        # Animal emojis for numbers
        '0': '🐶', '1': '🐱', '2': '🐭', '3': '🐹', '4': '🐰',
        '5': '🦊', '6': '🐻', '7': '🐼', '8': '🐨', '9': '🐯',
        
        # Food emojis for special characters
        ' ': '🍎', '.': '🍌', ',': '🍇', '!': '🍉', '?': '🍒',
        "'": '🍑', '"': '🍓', '-': '🍍', '_': '🥭', '+': '🍏',
        '=': '🍐', '/': '🍋', '\\': '🍊', '@': '🥥', '#': '🥑',
        '$': '🍆', '%': '🥔', '^': '🥕', '&': '🌽', '*': '🥦',
        '(': '🥒', ')': '🥬', '[': '🥭', ']': '🍅', '{': '🌶',
        '}': '🥑', '<': '🥨', '>': '🥞', ';': '🧀', ':': '🍖',
        
        # Travel emojis for uppercase letters
        'A': '✈️', 'B': '🚀', 'C': '🚁', 'D': '🚂', 'E': '🚃',
        'F': '🚄', 'G': '🚅', 'H': '🚆', 'I': '🚇', 'J': '🚈',
        'K': '🚉', 'L': '🚊', 'M': '🚋', 'N': '🚌', 'O': '🚍',
        'P': '🚎', 'Q': '🚐', 'R': '🚑', 'S': '🚒', 'T': '🚓',
        'U': '🚔', 'V': '🚕', 'W': '🚖', 'X': '🚗', 'Y': '🚘', 'Z': '🚙'
    },
    2: {
        # Different set for enhanced security
        'a': '🐉', 'b': '🐲', 'c': '🦄', 'd': '🦁', 'e': '🐯', 
        'f': '🐺', 'g': '🐶', 'h': '🐱', 'i': '🐭', 'j': '🐹',
        'k': '🐰', 'l': '🦊', 'm': '🐻', 'n': '🐼', 'o': '🐨',
        'p': '🐵', 'q': '🦍', 'r': '🦧', 's': '🐘', 't': '🦏',
        'u': '🦛', 'v': '🐪', 'w': '🐫', 'x': '🦒', 'y': '🦘', 'z': '🐃',
        
        '0': '🌑', '1': '🌒', '2': '🌓', '3': '🌔', '4': '🌕',
        '5': '🌖', '6': '🌗', '7': '🌘', '8': '🌙', '9': '🌚',
        
        ' ': '⚡', '.': '🔥', ',': '💧', '!': '🌪', '?': '🌈',
        "'": '❄️', '"': '💨', '-': '🌊', '_': '🍃', '+': '☀️',
        '=': '🌤', '/': '⛈', '\\': '🌧', '@': '🌨', '#': '⛅',
        '$': '🌥', '%': '🌦', '^': '🌩', '&': '🌀', '*': '✨',
        '(': '🌠', ')': '🎇', '[': '🎆', ']': '💫', '{': '⭐',
        '}': '🌟', '<': '☄️', '>': '🌌', ';': '🔭', ':': '👓',
        
        'A': '🛸', 'B': '👽', 'C': '🤖', 'D': '🎃', 'E': '😺',
        'F': '😸', 'G': '😹', 'H': '😻', 'I': '😼', 'J': '😽',
        'K': '🙀', 'L': '😿', 'M': '😾', 'N': '💀', 'O': '👻',
        'P': '👺', 'Q': '👹', 'R': '👾', 'S': '🦇', 'T': '🕷',
        'U': '🕸', 'V': '🦉', 'W': '🐍', 'X': '🦂', 'Y': '🦀', 'Z': '🦑'
    }
}

# Create reverse mappings for decryption
TEXT_MAPS = {level: {v: k for k, v in emoji_set.items()} for level, emoji_set in EMOJI_SETS.items()}

# Security configuration
SECURITY_LEVELS = {
    1: {"name": "Basic", "shuffle_rounds": 1, "salt_length": 4},
    2: {"name": "Enhanced", "shuffle_rounds": 3, "salt_length": 8}
}

class EncryptionRequest(BaseModel):
    text: str
    security_level: Optional[int] = 1  # Default to basic security
    custom_key: Optional[str] = None   # Optional custom key for additional security

class DecryptionRequest(BaseModel):
    emoji_text: str
    security_level: Optional[int] = 1  # Must match encryption level
    custom_key: Optional[str] = None   # Must match encryption key

def generate_salt(length: int) -> str:
    """Generate a random salt string"""
    return secrets.token_hex(length // 2)

def shuffle_text(text: str, key: str, rounds: int) -> str:
    """Shuffle text using a key for deterministic randomization"""
    # Convert key to a numeric seed
    seed = int(hashlib.sha256(key.encode()).hexdigest(), 16) % (10**8)
    
    # Use the seed to initialize a random generator for deterministic shuffling
    random_gen = secrets.SystemRandom()
    random_gen.seed(seed)
    
    # Perform multiple rounds of shuffling
    text_list = list(text)
    for _ in range(rounds):
        random_gen.shuffle(text_list)
    
    return ''.join(text_list)

def unshuffle_text(text: str, key: str, rounds: int) -> str:
    """Reverse the shuffling operation"""
    # To unshuffle, we need to know the original positions
    # Since shuffling is not easily reversible, we'll simulate the process
    # by creating an index mapping
    
    # Generate the same seed as during encryption
    seed = int(hashlib.sha256(key.encode()).hexdigest(), 16) % (10**8)
    random_gen = secrets.SystemRandom()
    random_gen.seed(seed)
    
    # Create a list of indices and shuffle them the same way
    indices = list(range(len(text)))
    for _ in range(rounds):
        random_gen.shuffle(indices)
    
    # Create a mapping from shuffled position to original position
    reverse_mapping = {new_idx: old_idx for old_idx, new_idx in enumerate(indices)}
    
    # Reconstruct the original text
    original_text = [''] * len(text)
    for i, char in enumerate(text):
        original_text[reverse_mapping[i]] = char
    
    return ''.join(original_text)

def encrypt_text(text: str, security_level: int = 1, custom_key: Optional[str] = None) -> str:
    """Encrypt text to emoji with enhanced security features"""
    if security_level not in EMOJI_SETS:
        security_level = 1  # Fallback to basic security
    
    # Get the appropriate emoji map
    emoji_map = EMOJI_SETS[security_level]
    security_config = SECURITY_LEVELS[security_level]
    
    # Generate or use custom key
    if custom_key:
        key = custom_key
    else:
        key = str(datetime.now().timestamp())
    
    # Add salt to the text
    salt = generate_salt(security_config["salt_length"])
    salted_text = salt + text
    
    # Shuffle the text before encryption
    shuffled_text = shuffle_text(salted_text, key, security_config["shuffle_rounds"])
    
    # Encrypt character by character
    encrypted = []
    for char in shuffled_text:
        if char in emoji_map:
            encrypted.append(emoji_map[char])
        else:
            # For unsupported characters, use a fallback with encoding
            char_code = str(ord(char))
            encoded_char = ''.join(emoji_map.get(c, '❓') for c in char_code)
            encrypted.append(f'🔒{encoded_char}🔓')
    
    # Add security level indicator
    level_indicators = ['❶', '❷', '❸', '❹', '❺']
    level_indicator = level_indicators[min(security_level - 1, len(level_indicators) - 1)]
    
    return level_indicator + ''.join(encrypted)

def decrypt_text(emoji_text: str, security_level: int = 1, custom_key: Optional[str] = None) -> str:
    """Decrypt emoji back to text with enhanced security features"""
    if security_level not in TEXT_MAPS:
        raise ValueError("Invalid security level")
    
    # Get the appropriate text map
    text_map = TEXT_MAPS[security_level]
    security_config = SECURITY_LEVELS[security_level]
    
    # Generate or use custom key (must match encryption key)
    if custom_key:
        key = custom_key
    else:
        # Without a custom key, we can't decrypt securely encrypted text
        if security_level > 1:
            raise ValueError("Custom key required for enhanced security decryption")
        key = ""  # Basic security might not need a key
    
    # Remove security level indicator if present
    if emoji_text and emoji_text[0] in ['❶', '❷', '❸', '❹', '❺']:
        emoji_text = emoji_text[1:]
    
    # Use a comprehensive regex pattern to match emojis
    emoji_pattern = re.compile(
        r'[\U0001F000-\U0001F9FF\U0001FA00-\U0001FA6F\U0001F600-\U0001F64F\U00002600-\U000026FF\U00002700-\U000027BF\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F700-\U0001F77F\U0001F900-\U0001F9FF]'
    )
    emojis = emoji_pattern.findall(emoji_text)
    
    # Handle encoded characters (between 🔒 and 🔓)
    decoded_text = []
    i = 0
    while i < len(emojis):
        if emojis[i] == '🔒':
            # Find the closing 🔓
            j = i + 1
            while j < len(emojis) and emojis[j] != '🔓':
                j += 1
            
            if j < len(emojis) and emojis[j] == '🔓':
                # Extract the encoded character code
                encoded_chars = emojis[i+1:j]
                char_code = ''.join(text_map.get(e, '?') for e in encoded_chars)
                try:
                    decoded_char = chr(int(char_code))
                    decoded_text.append(decoded_char)
                except (ValueError, TypeError):
                    decoded_text.append('?')
                i = j + 1
                continue
        decoded_text.append(text_map.get(emojis[i], '?'))
        i += 1
    
    # Join the decoded text
    decoded_str = ''.join(decoded_text)
    
    # Unshuffle the text
    unshuffled_text = unshuffle_text(decoded_str, key, security_config["shuffle_rounds"])
    
    # Remove salt (first n characters where n is salt_length)
    salt_length = security_config["salt_length"]
    if len(unshuffled_text) > salt_length:
        return unshuffled_text[salt_length:]
    else:
        return unshuffled_text

@app.post("/encrypt")
async def encrypt(request: EncryptionRequest):
    """Encrypt text to emoji with enhanced security"""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    if request.security_level not in EMOJI_SETS:
        raise HTTPException(status_code=400, detail="Invalid security level")
    
    try:
        encrypted = encrypt_text(
            request.text, 
            security_level=request.security_level,
            custom_key=request.custom_key
        )
        return {
            "encrypted": encrypted,
            "security_level": request.security_level,
            "security_name": SECURITY_LEVELS[request.security_level]["name"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {str(e)}")

@app.post("/decrypt")
async def decrypt(request: DecryptionRequest):
    """Decrypt emoji back to text with enhanced security"""
    if not request.emoji_text:
        raise HTTPException(status_code=400, detail="Emoji text cannot be empty")
    
    try:
        decrypted = decrypt_text(
            request.emoji_text, 
            security_level=request.security_level,
            custom_key=request.custom_key
        )
        return {"decrypted": decrypted}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption failed: {str(e)}")

@app.get("/security-levels")
async def get_security_levels():
    """Get information about available security levels"""
    return {
        level: {
            "name": config["name"],
            "shuffle_rounds": config["shuffle_rounds"],
            "salt_length": config["salt_length"]
        } 
        for level, config in SECURITY_LEVELS.items()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)