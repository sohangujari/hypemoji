from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import re
import secrets
from typing import Dict, Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Emoji Encryption API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define emoji mappings
EMOJI_MAP = {
    # Faces & Emotions for lowercase letters
    'a': '😀', 'b': '😃', 'c': '😄', 'd': '😁', 'e': '😆', 
    'f': '😅', 'g': '😂', 'h': '🤣', 'i': '😊', 'j': '😇',
    'k': '🙂', 'l': '🙃', 'm': '😉', 'n': '😌', 'o': '😍',
    'p': '🥰', 'q': '😘', 'r': '😗', 's': '😙', 't': '😚',
    'u': '😋', 'v': '😛', 'w': '😝', 'x': '😜', 'y': '🤪', 'z': '🤨',
    
    # Animals & Nature for numbers
    '0': '🐶', '1': '🐱', '2': '🐭', '3': '🐹', '4': '🐰',
    '5': '🦊', '6': '🐻', '7': '🐼', '8': '🐨', '9': '🐯',
    
    # Food & Drink for special characters
    ' ': '🍎', '.': '🍌', ',': '🍇', '!': '🍉', '?': '🍒',
    "'": '🍑', '"': '🍓', '-': '🍍', '_': '🥭', '+': '🍏',
    '=': '🍐', '/': '🍋', '\\': '🍊', '@': '🥥', '#': '🥑',
    '$': '🍆', '%': '🥔', '^': '🥕', '&': '🌽', '*': '🥦',
    '(': '🥒', ')': '🥬', '[': '🥭', ']': '🍅', '{': '🌶',
    '}': '🥑', '<': '🥨', '>': '🥞', ';': '🧀', ':': '🍖',
    
    # Travel & Places for uppercase letters
    'A': '✈️', 'B': '🚀', 'C': '🚁', 'D': '🚂', 'E': '🚃',
    'F': '🚄', 'G': '🚅', 'H': '🚆', 'I': '🚇', 'J': '🚈',
    'K': '🚉', 'L': '🚊', 'M': '🚋', 'N': '🚌', 'O': '🚍',
    'P': '🚎', 'Q': '🚐', 'R': '🚑', 'S': '🚒', 'T': '🚓',
    'U': '🚔', 'V': '🚕', 'W': '🚖', 'X': '🚗', 'Y': '🚘', 'Z': '🚙'
}

# Create reverse mapping for decryption
TEXT_MAP = {v: k for k, v in EMOJI_MAP.items()}

class EncryptionRequest(BaseModel):
    text: str
    custom_key: Optional[str] = None

class DecryptionRequest(BaseModel):
    emoji_text: str
    custom_key: Optional[str] = None

def shift_char(char: str, key_char: str) -> str:
    """Shift a character based on a key character"""
    if not char.isalnum():
        return char
    
    # Convert to a number (0-61) for alphanumeric characters
    if char.isdigit():
        char_num = ord(char) - ord('0')
    elif char.islower():
        char_num = ord(char) - ord('a') + 10
    else:
        char_num = ord(char) - ord('A') + 36
    
    # Convert key character to a number (0-61)
    if key_char.isdigit():
        key_num = ord(key_char) - ord('0')
    elif key_char.islower():
        key_num = ord(key_char) - ord('a') + 10
    else:
        key_num = ord(key_char) - ord('A') + 36
    
    # Apply shift
    shifted_num = (char_num + key_num) % 62
    
    # Convert back to character
    if shifted_num < 10:
        return chr(shifted_num + ord('0'))
    elif shifted_num < 36:
        return chr(shifted_num - 10 + ord('a'))
    else:
        return chr(shifted_num - 36 + ord('A'))

def unshift_char(char: str, key_char: str) -> str:
    """Unshift a character based on a key character"""
    if not char.isalnum():
        return char
    
    # Convert to a number (0-61) for alphanumeric characters
    if char.isdigit():
        char_num = ord(char) - ord('0')
    elif char.islower():
        char_num = ord(char) - ord('a') + 10
    else:
        char_num = ord(char) - ord('A') + 36
    
    # Convert key character to a number (0-61)
    if key_char.isdigit():
        key_num = ord(key_char) - ord('0')
    elif key_char.islower():
        key_num = ord(key_char) - ord('a') + 10
    else:
        key_num = ord(key_char) - ord('A') + 36
    
    # Apply unshift
    shifted_num = (char_num - key_num) % 62
    if shifted_num < 0:
        shifted_num += 62
    
    # Convert back to character
    if shifted_num < 10:
        return chr(shifted_num + ord('0'))
    elif shifted_num < 36:
        return chr(shifted_num - 10 + ord('a'))
    else:
        return chr(shifted_num - 36 + ord('A'))

def encrypt_text(text: str, custom_key: Optional[str] = None) -> str:
    """Encrypt text to emoji"""
    # Apply key-based transformation if provided
    if custom_key:
        transformed_text = []
        key_len = len(custom_key)
        for i, char in enumerate(text):
            key_char = custom_key[i % key_len]
            transformed_text.append(shift_char(char, key_char))
        text = ''.join(transformed_text)
    
    # Encrypt character by character
    encrypted = []
    for char in text:
        if char in EMOJI_MAP:
            encrypted.append(EMOJI_MAP[char])
        else:
            # For unsupported characters, use a fallback
            encrypted.append('❓')
    
    return ''.join(encrypted)

def decrypt_text(emoji_text: str, custom_key: Optional[str] = None) -> str:
    """Decrypt emoji back to text"""
    # Use a comprehensive regex pattern to match emojis
    emoji_pattern = re.compile(
        r'[\U0001F000-\U0001F9FF\U0001FA00-\U0001FA6F\U0001F600-\U0001F64F\U00002600-\U000026FF\U00002700-\U000027BF\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F700-\U0001F77F\U0001F900-\U0001F9FF]'
    )
    emojis = emoji_pattern.findall(emoji_text)
    
    # Decrypt emojis
    decrypted = []
    for emoji in emojis:
        if emoji in TEXT_MAP:
            decrypted.append(TEXT_MAP[emoji])
        else:
            # For unknown emojis, use a placeholder
            decrypted.append('?')
    
    text = ''.join(decrypted)
    
    # Reverse key-based transformation if provided
    if custom_key:
        transformed_text = []
        key_len = len(custom_key)
        for i, char in enumerate(text):
            key_char = custom_key[i % key_len]
            transformed_text.append(unshift_char(char, key_char))
        text = ''.join(transformed_text)
    
    return text

@app.post("/encrypt")
async def encrypt(request: EncryptionRequest):
    """Encrypt text to emoji"""
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    encrypted = encrypt_text(request.text, request.custom_key)
    return {"encrypted": encrypted}

@app.post("/decrypt")
async def decrypt(request: DecryptionRequest):
    """Decrypt emoji back to text"""
    if not request.emoji_text:
        raise HTTPException(status_code=400, detail="Emoji text cannot be empty")
    
    try:
        decrypted = decrypt_text(request.emoji_text, request.custom_key)
        return {"decrypted": decrypted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)