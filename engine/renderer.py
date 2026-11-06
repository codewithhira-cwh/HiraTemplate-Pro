"""HiraTemplate Pro Max - Renderer: Dot/index access, filters, loops, elif, extends & include execute karta hai."""
import re
import os
from .filters import FILTERS
from .parser import TextNode, VarNode, IfNode, ForNode, ExtendsNode, BlockNode, IncludeNode
from .exceptions import TemplateSyntaxError

def load_template_source(template_name: str) -> str:
    # Hinglish: Parent ya included template file ko locate karke read karta hai
    paths = [
        template_name,
        os.path.join("templates", template_name),
        os.path.join(os.path.dirname(__file__), "..", "templates", template_name),
        os.path.join(os.path.dirname(__file__), "..", template_name)
    ]
    for p in paths:
        if os.path.exists(p) and os.path.isfile(p):
            with open(p, "r", encoding="utf-8") as f:
                return f.read()
    raise TemplateSyntaxError(f"Template file '{template_name}' not found", 1, 1)

def resolve_path(expr: str, context: dict):
    # Hinglish: Safe variable lookup - missing hone par '' dega bina crash hue
    if not expr or context is None: return ""
    expr = expr.strip()
    if expr.startswith(('"', "'")) and expr.endswith(('"', "'")): return expr[1:-1]
    if expr in ("True", "False", "None"): return {"True": True, "False": False, "None": None}[expr]
    if expr.isdigit(): return int(expr)

    cleaned = re.sub(r'\[(\d+)\]', r'.\1', expr)
    cleaned = re.sub(r'\[[\'"]([^\'"]+)[\'"]\]', r'.\1', cleaned)
    curr = context
    for part in cleaned.split("."):
        if curr is None: return ""
        if isinstance(curr, dict):
            curr = curr.get(part, curr.get(int(part), "") if part.isdigit() else "")
        elif isinstance(curr, (list, tuple)):
            curr = curr[int(part)] if part.isdigit() and 0 <= int(part) < len(curr) else ""
        elif hasattr(curr, part):
            try: curr = getattr(curr, part)
            except Exception: return ""
        else:
            return ""
        if curr == "": return ""
    return curr

def eval_condition(cond: str, ctx: dict) -> bool:
    cond = cond.strip()
    if not cond: return False
    if cond.startswith("not "): return not bool(resolve_path(cond[4:].strip(), ctx))
    if "==" in cond: l, r = cond.split("==", 1); return str(resolve_path(l.strip(), ctx)) == str(resolve_path(r.strip(), ctx))
    if "!=" in cond: l, r = cond.split("!=", 1); return str(resolve_path(l.strip(), ctx)) != str(resolve_path(r.strip(), ctx))
    return bool(resolve_path(cond, ctx))

def render_node(node, ctx: dict, blocks: dict = None) -> str:
    blocks = blocks or {}
    if isinstance(node, TextNode): return node.text
    if isinstance(node, VarNode):
        val = resolve_path(node.expr, ctx)
        for name, args in node.filters:
            if name in FILTERS:
                try: val = FILTERS[name](val, *args)
                except Exception: val = ""
        return str(val) if val is not None else ""
    if isinstance(node, IfNode):
        for cond, branch in node.branches:
            if eval_condition(cond, ctx):
                return "".join(render_node(c, ctx, blocks) for c in branch)
        return "".join(render_node(c, ctx, blocks) for c in node.false_nodes)
    if isinstance(node, ForNode):
        coll = resolve_path(node.collection_expr, ctx)
        if not coll or not hasattr(coll, "__iter__") or isinstance(coll, (str, bytes)): return ""
        items = list(coll)
        res = []
        for i, it in enumerate(items):
            loop_ctx = {"index": i + 1, "index0": i, "first": i == 0, "last": i == len(items) - 1, "length": len(items)}
            sub = {**ctx, node.item_name: it, "loop": loop_ctx}
            res.extend(render_node(c, sub, blocks) for c in node.body_nodes)
        return "".join(res)
    if isinstance(node, BlockNode):
        target = blocks.get(node.name, node.body)
        return "".join(render_node(c, ctx, blocks) for c in target)
    if isinstance(node, IncludeNode):
        from . import _compile_cached
        inc_src = load_template_source(node.template_name)
        inc_ast = list(_compile_cached(inc_src))
        return render_ast(inc_ast, ctx, blocks)
    return ""

def render_ast(nodes: list, context: dict, blocks: dict = None) -> str:
    blocks = blocks or {}
    # Extends check: agar template extends karta hai toh parent AST render hoga child blocks ke sath
    extends_nodes = [n for n in nodes if isinstance(n, ExtendsNode)]
    if extends_nodes:
        from . import _compile_cached
        parent_name = extends_nodes[0].parent
        child_blocks = {n.name: n.body for n in nodes if isinstance(n, BlockNode)}
        merged_blocks = {**blocks, **child_blocks}
        parent_src = load_template_source(parent_name)
        parent_ast = list(_compile_cached(parent_src))
        return render_ast(parent_ast, context, merged_blocks)
    return "".join(render_node(n, context, blocks) for n in nodes)
