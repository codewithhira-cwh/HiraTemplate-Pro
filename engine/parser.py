"""HiraTemplate Pro Max - Parser: Tokens se AST banata hai with If/Elif/Else, Extends, Block, Include."""
from .lexer import TOKEN_TEXT, TOKEN_VAR, TOKEN_TAG, TOKEN_EOF
from .exceptions import TemplateSyntaxError
from .filters import FILTERS

class Node: pass
class TextNode(Node):
    def __init__(self, text: str): self.text = text
class VarNode(Node):
    def __init__(self, expr: str, filters: list, line: int):
        self.expr, self.filters, self.line = expr, filters, line
class IfNode(Node):
    def __init__(self, branches: list, false_nodes: list = None):
        self.branches = branches  # [(cond, [nodes]), ...]
        self.false_nodes = false_nodes or []
class ForNode(Node):
    def __init__(self, item: str, coll: str, body: list):
        self.item_name, self.collection_expr, self.body_nodes = item, coll, body
class ExtendsNode(Node):
    def __init__(self, parent: str): self.parent = parent
class BlockNode(Node):
    def __init__(self, name: str, body: list): self.name, self.body = name, body
class IncludeNode(Node):
    def __init__(self, template_name: str): self.template_name = template_name

def _parse_filter_chain(raw: str, line: int):
    # Hinglish: name | upper | default("Guest") pipeline parse karo aur unknown filter validate karo
    parts = [p.strip() for p in raw.split("|")]
    expr, filters = parts[0], []
    for f in parts[1:]:
        if not f: continue
        if "(" in f and f.endswith(")"):
            name = f[:f.index("(")].strip()
            args = [a.strip()[1:-1] if (a.strip().startswith(('"', "'")) and a.strip().endswith(('"', "'")))
                    else int(a.strip()) if a.strip().isdigit() else a.strip()
                    for a in f[f.index("(")+1:-1].split(",") if a.strip()]
        else:
            name, args = f.strip(), []
        if name not in FILTERS:
            raise TemplateSyntaxError(f"Unknown filter: {name} at line {line}", line=line)
        filters.append((name, args))
    return expr, filters

class Parser:
    def __init__(self, tokens: list): self.tokens, self.pos = tokens, 0
    def cur(self): return self.tokens[self.pos] if self.pos < len(self.tokens) else self.tokens[-1]
    def consume(self): t = self.cur(); self.pos += 1; return t

    def parse(self) -> list:
        nodes = self._parse_block(stop_tags=())
        if self.cur().type != TOKEN_EOF:
            raise TemplateSyntaxError(f"Unexpected token '{self.cur().value}'", self.cur().line, self.cur().col)
        return nodes

    def _parse_block(self, stop_tags: tuple) -> list:
        # Hinglish: Block parse karo jab tak stop tag na mile
        nodes = []
        while self.cur().type != TOKEN_EOF:
            tok = self.cur()
            if tok.type == TOKEN_TAG:
                parts = tok.value.split()
                tag = parts[0] if parts else ""
                if tag in stop_tags: return nodes
                self.consume()
                if tag == "if":
                    cond = " ".join(parts[1:]).strip()
                    if not cond: raise TemplateSyntaxError("Missing if condition", tok.line, tok.col)
                    branches = [(cond, self._parse_block(stop_tags=("elif", "else", "endif")))]
                    while self.cur().type == TOKEN_TAG and self.cur().value.split()[0] == "elif":
                        e_tok = self.consume()
                        e_cond = " ".join(e_tok.value.split()[1:]).strip()
                        if not e_cond: raise TemplateSyntaxError("Missing elif condition", e_tok.line, e_tok.col)
                        branches.append((e_cond, self._parse_block(stop_tags=("elif", "else", "endif"))))
                    f_branch = []
                    if self.cur().type == TOKEN_TAG and self.cur().value.split()[0] == "else":
                        self.consume()
                        f_branch = self._parse_block(stop_tags=("endif",))
                    if self.cur().type != TOKEN_TAG or self.cur().value.split()[0] != "endif":
                        raise TemplateSyntaxError("Unclosed 'if', missing 'endif'", tok.line, tok.col)
                    self.consume()
                    nodes.append(IfNode(branches, f_branch))
                elif tag == "for":
                    if len(parts) < 4 or parts[2] != "in":
                        raise TemplateSyntaxError("Invalid for syntax, expected '{% for item in coll %}'", tok.line, tok.col)
                    item, coll = parts[1], parts[3]
                    body = self._parse_block(stop_tags=("endfor",))
                    if self.cur().type != TOKEN_TAG or self.cur().value.split()[0] != "endfor":
                        raise TemplateSyntaxError("Unclosed 'for', missing 'endfor'", tok.line, tok.col)
                    self.consume()
                    nodes.append(ForNode(item, coll, body))
                elif tag == "extends":
                    if len(parts) < 2: raise TemplateSyntaxError("Missing template name in extends", tok.line, tok.col)
                    nodes.append(ExtendsNode(parts[1].strip('"\'')))
                elif tag == "block":
                    if len(parts) < 2: raise TemplateSyntaxError("Missing block name", tok.line, tok.col)
                    name = parts[1]
                    body = self._parse_block(stop_tags=("endblock",))
                    if self.cur().type != TOKEN_TAG or self.cur().value.split()[0] != "endblock":
                        raise TemplateSyntaxError(f"Unclosed 'block {name}', missing 'endblock'", tok.line, tok.col)
                    self.consume()
                    nodes.append(BlockNode(name, body))
                elif tag == "include":
                    if len(parts) < 2: raise TemplateSyntaxError("Missing template name in include", tok.line, tok.col)
                    nodes.append(IncludeNode(parts[1].strip('"\'')))
                else:
                    raise TemplateSyntaxError(f"Unexpected tag '{tag}'", tok.line, tok.col)
            elif tok.type == TOKEN_VAR:
                self.consume()
                expr, filters = _parse_filter_chain(tok.value, tok.line)
                nodes.append(VarNode(expr, filters, tok.line))
            elif tok.type == TOKEN_TEXT:
                self.consume()
                nodes.append(TextNode(tok.value))
        if stop_tags:
            raise TemplateSyntaxError(f"Block unclosed, expected {stop_tags}", self.cur().line, self.cur().col)
        return nodes
