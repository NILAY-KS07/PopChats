import os
import re

def load_banned_words():
    file_path = os.path.join(os.path.dirname(__file__), 'banned.txt')
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r', encoding='utf-8') as f:
        return [line.strip().lower() for line in f if line.strip()]

BANNED_WORDS = load_banned_words()

def normalize(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    text = re.sub(r'(.)\1+', r'\1', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


NORMALIZED_BANNED = [normalize(word) for word in BANNED_WORDS]
BANNED_SET = set(NORMALIZED_BANNED)


def is_clean(text):
    normalized_text = normalize(text)
    padded = f" {normalized_text} "
    for word in BANNED_SET:
        if f" {word} " in padded:
            return False
    return True