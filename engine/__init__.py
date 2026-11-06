"""HiraTemplate Pro Max - Fast, cached Python template engine."""
from functools import lru_cache
from .lexer import tokenize
from .parser import Parser
from .exceptions import TemplateError, TemplateSyntaxError
from .filters import FILTERS

__version__ = "1.0.0"

@lru_cache(maxsize=512)
def _compile_cached(template_str: str) -> tuple:
    # Hinglish: AST compilation cached hai taaki same template dobara tokenize/parse na ho
    return tuple(Parser(tokenize(template_str)).parse())

from .renderer import render_ast

class HiraTemplate:
    """HiraTemplate class: LRU caching aur clean API ke saath."""
    def __init__(self, template_str: str):
        self.template_str = template_str if template_str is not None else ""
        self.ast = list(_compile_cached(self.template_str))

    def render(self, context: dict = None) -> str:
        # Context ke saath render karo (missing keys safe)
        return render_ast(self.ast, context or {})

    @classmethod
    def from_file(cls, filepath: str):
        with open(filepath, "r", encoding="utf-8") as f:
            return cls(f.read())

    @staticmethod
    def get_cache_info():
        return _compile_cached.cache_info()

    @staticmethod
    def clear_cache():
        _compile_cached.cache_clear()

__all__ = ["HiraTemplate", "TemplateError", "TemplateSyntaxError", "FILTERS", "__version__"]
