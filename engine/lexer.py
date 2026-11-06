"""HiraTemplate Pro Max - Lexer: Tokenizer with exact line & column tracking for {{ }}, {% %}, {# %}."""
from .exceptions import TemplateSyntaxError

TOKEN_TEXT, TOKEN_VAR, TOKEN_TAG, TOKEN_EOF = "TEXT", "VAR", "TAG", "EOF"

class Token:
    def __init__(self, t_type: str, val: str, line: int, col: int = 1):
        self.type, self.value, self.line, self.col = t_type, val, line, col
    def __repr__(self):
        return f"Token({self.type}, {repr(self.value)}, line={self.line}, col={self.col})"

def tokenize(template_str: str) -> list:
    if template_str is None: template_str = ""
    tokens, i, n = [], 0, len(template_str)
    line, col = 1, 1
    t_start, t_line, t_col = 0, 1, 1

    def advance(s):
        nonlocal line, col
        for ch in s:
            if ch == '\n': line += 1; col = 1
            else: col += 1

    while i < n:
        if template_str[i:i+2] in ("{{", "{%", "{#"):
            d = template_str[i:i+2]
            d_line, d_col = line, col
            if i > t_start:
                tokens.append(Token(TOKEN_TEXT, template_str[t_start:i], t_line, t_col))

            close_d = "}}" if d == "{{" else "%}" if d == "{%" else "#}"
            end_idx = template_str.find(close_d, i + 2)
            if end_idx == -1:
                preview = template_str[i:i+15].replace("\n", " ").strip() or "EOF"
                raise TemplateSyntaxError(f"at line {d_line}, col {d_col}: Expected {close_d} - Found {preview}", d_line, d_col)

            content = template_str[i+2:end_idx]
            if d == "{{":
                tokens.append(Token(TOKEN_VAR, content.strip(), d_line, d_col))
            elif d == "{%":
                tokens.append(Token(TOKEN_TAG, content.strip(), d_line, d_col))
            # Comment {# #} is ignored without adding token

            advance(template_str[i:end_idx+2])
            i = end_idx + 2
            t_start, t_line, t_col = i, line, col
        else:
            if template_str[i] == '\n': line += 1; col = 1
            else: col += 1
            i += 1

    if i > t_start:
        tokens.append(Token(TOKEN_TEXT, template_str[t_start:i], t_line, t_col))
    tokens.append(Token(TOKEN_EOF, "", line, col))
    return tokens
