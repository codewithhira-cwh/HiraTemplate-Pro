"""HiraTemplate Pro Max - Main Runner & Test Suite (8/8 PASS)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# PIP package alias verify karo: from hira_template import HiraTemplate
from hira_template import HiraTemplate, TemplateSyntaxError, __version__

def run_tests():
    print("=" * 65)
    print(f"🚀 HIRATEMPLATE PRO MAX v{__version__} - RUNNING 8 PASS/FAIL TESTS")
    print("=" * 65)
    passed = 0

    # -------------------------------------------------------------
    # TEST 1: Basic Variables, Dot Access & Array Index
    # -------------------------------------------------------------
    t1 = HiraTemplate("Hello {{ name }}, Boss: {{ user.name }}, Fav: {{ items[0] }}")
    d1 = {"name": "Hira", "user": {"name": "Alex"}, "items": ["Python", "Rust"]}
    if t1.render(d1) == "Hello Hira, Boss: Alex, Fav: Python":
        print("✅ TEST 1 [PASS]: Basic variables, dot access & array index"); passed += 1
    else: print("❌ TEST 1 [FAIL]")

    # -------------------------------------------------------------
    # TEST 2: Filter Chaining with Arguments (upper, trim, default)
    # -------------------------------------------------------------
    t2_a = HiraTemplate("Hi {{ name | upper | trim | default(\"Guest\") }}!")
    t2_b = HiraTemplate("Welcome {{ missing_user | default(\"Guest\") }}")
    if t2_a.render({"name": "  hira  "}) == "Hi HIRA!" and t2_b.render({}) == "Welcome Guest":
        print("✅ TEST 2 [PASS]: Filter chaining & arguments (upper, trim, default)"); passed += 1
    else: print("❌ TEST 2 [FAIL]")

    # -------------------------------------------------------------
    # TEST 3: Comments Ignored
    # -------------------------------------------------------------
    t3 = HiraTemplate("Code {# secret comment ignored #}Crafters")
    if t3.render({}) == "Code Crafters":
        print("✅ TEST 3 [PASS]: Comments {# ... #} ignored"); passed += 1
    else: print("❌ TEST 3 [FAIL]")

    # -------------------------------------------------------------
    # TEST 4: If / Elif / Else Conditional Logic
    # {% if user.is_admin %} Admin {% elif user.active %} Active {% else %} Guest {% endif %}
    # -------------------------------------------------------------
    tpl_if = HiraTemplate("{% if user.is_admin %}Admin{% elif user.active %}Active{% else %}Guest{% endif %}")
    r_admin = tpl_if.render({"user": {"is_admin": True, "active": False}})
    r_active = tpl_if.render({"user": {"is_admin": False, "active": True}})
    r_guest = tpl_if.render({"user": {"is_admin": False, "active": False}})
    if r_admin == "Admin" and r_active == "Active" and r_guest == "Guest":
        print("✅ TEST 4 [PASS]: If / Elif / Else conditional branching"); passed += 1
    else: print(f"❌ TEST 4 [FAIL]: admin={r_admin}, active={r_active}, guest={r_guest}")

    # -------------------------------------------------------------
    # TEST 5: For Loops with loop.index & loop.last
    # -------------------------------------------------------------
    t5 = HiraTemplate("{% for s in students %}{{ loop.index }}. {{ s.name }}{% if not loop.last %}, {% endif %}{% endfor %}")
    d5 = {"students": [{"name": "Aarav"}, {"name": "Diya"}]}
    if t5.render(d5) == "1. Aarav, 2. Diya":
        print("✅ TEST 5 [PASS]: For loops with loop.index & loop.last"); passed += 1
    else: print("❌ TEST 5 [FAIL]")

    # -------------------------------------------------------------
    # TEST 6: Template Inheritance ({% extends "base.html" %} + {% block %})
    # -------------------------------------------------------------
    child_tpl = """{% extends "base.html" %}
{% block title %}Child Page Title{% endblock %}
{% block content %}
<h1>Overridden Child Content</h1>
{% endblock %}"""
    t6 = HiraTemplate(child_tpl)
    res6 = t6.render({"user": {"name": "Hira"}})
    if "Child Page Title" in res6 and "Overridden Child Content" in res6 and "Default Content Block" not in res6:
        print("✅ TEST 6 [PASS]: Template inheritance ({% extends %} & {% block %})"); passed += 1
    else: print(f"❌ TEST 6 [FAIL]: {res6}")

    # -------------------------------------------------------------
    # TEST 7: Template Inclusion ({% include "header.html" %})
    # -------------------------------------------------------------
    t7 = HiraTemplate("<section>{% include \"header.html\" %}</section>")
    res7 = t7.render({"user": {"name": "Hira Sharma"}})
    if "<header class=\"site-header\">" in res7 and "User: Hira Sharma" in res7:
        print("✅ TEST 7 [PASS]: Template inclusion ({% include %})"); passed += 1
    else: print(f"❌ TEST 7 [FAIL]: {res7}")

    # -------------------------------------------------------------
    # TEST 8: Error Handling (Unclosed tag line/col, unknown filter, safe missing var)
    # -------------------------------------------------------------
    err1_ok = False
    try:
        HiraTemplate("Hello {{ unclosed_var")
    except TemplateSyntaxError as e:
        if "at line 1, col 7: Expected }}" in str(e):
            err1_ok = True

    err2_ok = False
    try:
        HiraTemplate("Hello {{ name | bad_filter }}")
    except TemplateSyntaxError as e:
        if "Unknown filter: bad_filter at line 1" in str(e):
            err2_ok = True

    safe_var_ok = HiraTemplate("Missing: [{{ ghost.unknown.prop }}]").render({}) == "Missing: []"

    if err1_ok and err2_ok and safe_var_ok:
        print("✅ TEST 8 [PASS]: Error handling (line/col unclosed, unknown filter, safe missing var)"); passed += 1
    else:
        print(f"❌ TEST 8 [FAIL]: err1={err1_ok}, err2={err2_ok}, safe={safe_var_ok}")

    # -------------------------------------------------------------
    # Cache and Summary Verification
    # -------------------------------------------------------------
    hits = HiraTemplate.get_cache_info().hits
    print("=" * 65)
    if passed == 8:
        print(f"🎉 ALL 8/8 TESTS PASSED! Cache Hits: {hits}. PIP Ready.")
        print("=" * 65)
    else:
        print(f"⚠️ {passed}/8 Tests Passed.")
        print("=" * 65)
        sys.exit(1)

def demo():
    print("\n🔥 HIRATEMPLATE PRO MAX - LIVE DEMO:")
    print(">>> from hira_template import HiraTemplate")
    print("1. Filter Chaining:", HiraTemplate("Hello {{ name | upper | trim }}!").render({"name": "  hira  "}))
    print("2. Elif Branching: ", HiraTemplate("{% if role == 'admin' %}Admin{% elif role == 'staff' %}Staff{% else %}Guest{% endif %}").render({"role": "staff"}))
    print("3. Safe Missing:   ", HiraTemplate("Value: [{{ deeply.missing.key }}]").render({}))

if __name__ == "__main__":
    run_tests()
    demo()
