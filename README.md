# HiraTemplate Pro Max

A real, advanced, runnable Python template engine built from scratch.

## Installation
```bash
pkg update && pkg upgrade -y
pkg install python git -y
git clone https://github.com/codewithhira-cwh/HiraTemplate-Pro.git
cd HiraTemplate-Pro
python main.py

```

## Quick Start
```python
from hira_template import HiraTemplate

# Basic usage
tpl = HiraTemplate("Hello {{ name | upper }}!")
print(tpl.render({"name": "hira"})) # -> Hello HIRA!

# Conditionals with elif
tpl_if = HiraTemplate("{% if user.is_admin %}Admin{% elif user.active %}Active{% else %}Guest{% endif %}")
print(tpl_if.render({"user": {"is_admin": False, "active": True}})) # -> Active

# Inheritance
# base.html: <html><body>{% block content %}{% endblock %}</body></html>
# child.html: {% extends "base.html" %}{% block content %}Hello{% endblock %}
```
