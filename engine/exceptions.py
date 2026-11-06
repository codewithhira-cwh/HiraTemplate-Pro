"""HiraTemplate Pro Max - Exceptions: Line & Column tracking ke sath errors."""
class TemplateError(Exception):
    """Base error class sabhi template errors ke liye."""
    pass

class TemplateSyntaxError(TemplateError):
    """Syntax ya filter galat hone par detailed error deta hai line aur column ke sath."""
    def __init__(self, message: str, line: int = 1, col: int = 1):
        self.message = message
        self.line = line
        self.col = col
        if message.startswith("TemplateSyntaxError"):
            full_msg = message
        elif "at line" in message:
            full_msg = f"TemplateSyntaxError {message}"
        else:
            full_msg = f"TemplateSyntaxError at line {line}, col {col}: {message}"
        super().__init__(full_msg)
