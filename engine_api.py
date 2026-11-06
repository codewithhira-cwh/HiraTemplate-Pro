"""
API helper for HiraTemplate Pro Max UI integration.
Takes JSON from stdin and returns structured token, AST, and render result.
"""
import sys
import json
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import HiraTemplate, TemplateSyntaxError
from engine.lexer import tokenize, TOKEN_EOF
from engine.filters import FILTERS

def serialize_ast(nodes):
    res = []
    for node in nodes:
        cls_name = node.__class__.__name__
        if cls_name == "TextNode":
            res.append({"type": "TextNode", "text": node.text})
        elif cls_name == "VarNode":
            res.append({"type": "VarNode", "expr": node.expr, "filters": node.filters, "line": getattr(node, "line", 1)})
        elif cls_name == "IfNode":
            res.append({
                "type": "IfNode",
                "branches": [
                    {"condition": cond, "body": serialize_ast(b)}
                    for cond, b in node.branches
                ],
                "false_nodes": serialize_ast(node.false_nodes)
            })
        elif cls_name == "ForNode":
            res.append({
                "type": "ForNode",
                "item_name": node.item_name,
                "collection_expr": node.collection_expr,
                "body_nodes": serialize_ast(node.body_nodes)
            })
        elif cls_name == "ExtendsNode":
            res.append({"type": "ExtendsNode", "parent": node.parent})
        elif cls_name == "BlockNode":
            res.append({"type": "BlockNode", "name": node.name, "body": serialize_ast(node.body)})
        elif cls_name == "IncludeNode":
            res.append({"type": "IncludeNode", "template_name": node.template_name})
    return res

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"error": "Empty input"}))
            return
        payload = json.loads(raw_input)
        action = payload.get("action", "render")

        if action == "render":
            template_str = payload.get("template", "")
            context = payload.get("context", {})
            start_time = time.perf_counter()

            # Tokenize inspection with line and col
            tokens = [
                {"type": t.type, "value": t.value, "line": t.line, "col": getattr(t, "col", 1)}
                for t in tokenize(template_str)
                if t.type != TOKEN_EOF
            ]

            tpl = HiraTemplate(template_str)
            rendered = tpl.render(context)
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            cache_info = HiraTemplate.get_cache_info()

            print(json.dumps({
                "success": True,
                "output": rendered,
                "tokens": tokens,
                "ast": serialize_ast(tpl.ast),
                "elapsedMs": round(elapsed_ms, 3),
                "cache": {
                    "hits": cache_info.hits,
                    "misses": cache_info.misses,
                    "maxsize": cache_info.maxsize,
                    "currsize": cache_info.currsize
                }
            }))
        elif action == "filter":
            filter_name = payload.get("filter")
            val = payload.get("value")
            args = payload.get("args", [])
            if filter_name in FILTERS:
                out = FILTERS[filter_name](val, *args)
                print(json.dumps({"success": True, "output": out}))
            else:
                print(json.dumps({"success": False, "error": f"Filter {filter_name} not found"}))
    except TemplateSyntaxError as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "line": getattr(e, "line", 1),
            "col": getattr(e, "col", 1)
        }))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
