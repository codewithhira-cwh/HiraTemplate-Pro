"""HiraTemplate Pro Max - 10 Standard Filters: Har filter deterministic transform deta hai."""
import html

# Hinglish: 10 Core filters + safe html escape (sab zero external dependency)
FILTERS = {
    "upper": lambda v, *a: str(v).upper() if v is not None else "",
    "lower": lambda v, *a: str(v).lower() if v is not None else "",
    "trim": lambda v, *a: str(v).strip() if v is not None else "",
    "title": lambda v, *a: str(v).title() if v is not None else "",
    "length": lambda v, *a: len(v) if hasattr(v, "__len__") else 0,
    "reverse": lambda v, *a: list(reversed(v)) if isinstance(v, (list, tuple)) else str(v)[::-1] if v is not None else "",
    "default": lambda v, d="": d if (v is None or v == "" or v is False) else v,
    "first": lambda v, *a: v[0] if (hasattr(v, "__getitem__") and len(v) > 0) else "",
    "last": lambda v, *a: v[-1] if (hasattr(v, "__getitem__") and len(v) > 0) else "",
    "join": lambda v, s=", ": s.join(str(x) for x in v) if hasattr(v, "__iter__") and not isinstance(v, (str, bytes)) else str(v) if v is not None else "",
    "escape": lambda v, *a: html.escape(str(v)) if v is not None else "",
}
