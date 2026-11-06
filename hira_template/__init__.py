"""
HiraTemplate PIP Package Alias.
Usage: from hira_template import HiraTemplate
"""
from engine import HiraTemplate, TemplateError, TemplateSyntaxError, FILTERS, __version__

__all__ = ["HiraTemplate", "TemplateError", "TemplateSyntaxError", "FILTERS", "__version__"]
