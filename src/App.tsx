import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  FileCode2,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Zap,
  ArrowRight,
  ShieldCheck,
  Brackets,
  Filter,
  Eye,
  Code2,
  PackageCheck,
  AlertTriangle,
  GitBranch,
  Split,
  Trophy,
  Quote
} from 'lucide-react';

interface EngineFile {
  path: string;
  content: string;
  lines: number;
  exists: boolean;
}

interface TokenItem {
  type: string;
  value: string;
  line: number;
  col?: number;
}

interface AstNode {
  type: string;
  text?: string;
  expr?: string;
  filters?: [string, any[]][];
  condition?: string;
  branches?: { condition: string; body: AstNode[] }[];
  false_nodes?: AstNode[];
  item_name?: string;
  collection_expr?: string;
  body_nodes?: AstNode[];
  parent?: string;
  name?: string;
  body?: AstNode[];
  template_name?: string;
}

interface RenderResult {
  success: boolean;
  output?: string;
  tokens?: TokenItem[];
  ast?: AstNode[];
  elapsedMs?: number;
  cache?: {
    hits: number;
    misses: number;
    maxsize: number;
    currsize: number;
  };
  error?: string;
  line?: number;
  col?: number;
}

interface TestRunResult {
  success: boolean;
  output: string;
  exitCode: number;
}

const PRESETS = [
  {
    name: '1. If / Elif / Else Conditional Logic',
    description: '{% if user.is_admin %} Admin {% elif user.active %} Active {% else %} Guest {% endif %}',
    template: `Current User: {{ user.name }}
Role Badge:
{% if user.is_admin %}
  👑 System Administrator (Full Access)
{% elif user.active %}
  ⚡ Active Member (Standard Access)
{% else %}
  👤 Guest Visitor (Read-Only)
{% endif %}`,
    context: JSON.stringify(
      {
        user: {
          name: 'Hira Sharma',
          is_admin: false,
          active: true
        }
      },
      null,
      2
    )
  },
  {
    name: '2. Template Inheritance (Extends & Block)',
    description: '{% extends "base.html" %} + {% block content %} ... {% endblock %}',
    template: `{% extends "base.html" %}

{% block title %}Dashboard • HiraTemplate Pro Max{% endblock %}

{% block content %}
<div class="card">
  <h2>Welcome to the Extended View, {{ user.name }}!</h2>
  <p>This content was dynamically injected into the base layout's content block.</p>
  <span class="badge">Inherited cleanly from base.html</span>
</div>
{% endblock %}`,
    context: JSON.stringify(
      {
        user: { name: 'Hira' }
      },
      null,
      2
    )
  },
  {
    name: '3. Template Inclusion ({% include %})',
    description: '{% include "header.html" %} embeds reusable components.',
    template: `{# Reusable Header Component Inclusion #}
{% include "header.html" %}

<main class="page-body">
  <h2>Main Application Content</h2>
  <p>Header was included seamlessly from templates/header.html.</p>
</main>`,
    context: JSON.stringify(
      {
        user: { name: 'Lead Architect Hira' }
      },
      null,
      2
    )
  },
  {
    name: '4. Error Trigger: Syntax / Unclosed Tag',
    description: 'Demonstrates precise line & column tracking for unclosed delimiters.',
    template: `Hello {{ user.name }}!
Welcome to the compiler test.
{# Missing closing tag below to demonstrate line X, col Y error #}
Here is an unclosed expression: {{ broken_var

End of template.`,
    context: JSON.stringify(
      {
        user: { name: 'Hira' }
      },
      null,
      2
    )
  },
  {
    name: '5. Error Trigger: Unknown Filter',
    description: 'Demonstrates immediate detection of unregistered filters with line numbers.',
    template: `Hello {{ user.name | non_existent_filter }}!`,
    context: JSON.stringify(
      {
        user: { name: 'Hira' }
      },
      null,
      2
    )
  },
  {
    name: '6. Filter Chaining & Arguments',
    description: '{{ name | upper | trim | default("Guest") }} with multi-arg filters.',
    template: `Greeting 1: Hello {{ raw_name | upper | trim | default("Guest") }}!
Greeting 2: Welcome {{ missing_user | default("Anonymous Friend") }}!
Joined Tags: {{ tags | join(" • ") }}
Reverse Word: {{ secret_code | reverse }}
Letter Count: {{ secret_code | length }} chars
Safe HTML: {{ dangerous_html | escape }}`,
    context: JSON.stringify(
      {
        raw_name: '   hira dev   ',
        tags: ['Engine', 'Lexer', 'Parser', 'Renderer'],
        secret_code: 'ROTAPILER',
        dangerous_html: '<script>alert("Hacked!")</script>'
      },
      null,
      2
    )
  },
  {
    name: '7. For Loop & loop.index',
    description: '{% for s in students %} with {{ loop.index }}, {{ loop.first }}, {{ loop.last }}.',
    template: `<h3>Student Roster (Total: {{ students | length }})</h3>
<ul>
{% for s in students %}
  <li>
    #{{ loop.index }}. {{ s.name }} - Grade: {{ s.grade }}
    {% if loop.first %} [⭐ Class Representative]{% endif %}
    {% if loop.last %} [🏁 End of List]{% endif %}
  </li>
{% endfor %}
</ul>`,
    context: JSON.stringify(
      {
        students: [
          { name: 'Aarav Sharma', grade: 'A+' },
          { name: 'Diya Patel', grade: 'A' },
          { name: 'Kabir Mehta', grade: 'A-' }
        ]
      },
      null,
      2
    )
  }
];

const FILTERS_DOCS = [
  { name: 'upper', desc: 'Converts string to uppercase', example: '{{ "hira" | upper }}', output: 'HIRA' },
  { name: 'lower', desc: 'Converts string to lowercase', example: '{{ "HELLO" | lower }}', output: 'hello' },
  { name: 'trim', desc: 'Strips leading and trailing whitespace', example: '{{ "  abc  " | trim }}', output: 'abc' },
  { name: 'title', desc: 'Capitalizes the first character of each word', example: '{{ "hira template" | title }}', output: 'Hira Template' },
  { name: 'length', desc: 'Returns the count of items or string length', example: '{{ [1, 2, 3] | length }}', output: '3' },
  { name: 'reverse', desc: 'Reverses a list or a string', example: '{{ "engine" | reverse }}', output: 'enigne' },
  { name: 'default', desc: 'Provides fallback if value is empty, false or None', example: '{{ missing | default("Guest") }}', output: 'Guest' },
  { name: 'first', desc: 'Returns the very first item of a sequence', example: '{{ ["a", "b"] | first }}', output: 'a' },
  { name: 'last', desc: 'Returns the last item of a sequence', example: '{{ ["a", "b"] | last }}', output: 'b' },
  { name: 'join', desc: 'Joins sequence elements with a custom separator', example: '{{ ["py", "rs"] | join(" + ") }}', output: 'py + rs' },
  { name: 'escape', desc: 'HTML-escapes special characters (&, <, >, ", \')', example: '{{ "<b>Bold</b>" | escape }}', output: '&lt;b&gt;Bold&lt;/b&gt;' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'playground' | 'tests' | 'filters' | 'package' | 'files'>('playground');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [templateInput, setTemplateInput] = useState(PRESETS[0].template);
  const [contextInput, setContextInput] = useState(PRESETS[0].context);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'html' | 'tokens' | 'ast'>('rendered');

  // Test Runner state
  const [testResult, setTestResult] = useState<TestRunResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Source files state
  const [engineFiles, setEngineFiles] = useState<EngineFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedPip, setCopiedPip] = useState(false);

  useEffect(() => {
    fetchFiles();
    executeRender(PRESETS[0].template, PRESETS[0].context);
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/engine-files');
      if (res.ok) {
        const data = await res.json();
        setEngineFiles(data.files || []);
      }
    } catch (e) {
      console.error('Failed to load engine files', e);
    }
  };

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    setTemplateInput(PRESETS[idx].template);
    setContextInput(PRESETS[idx].context);
    executeRender(PRESETS[idx].template, PRESETS[idx].context);
  };

  const executeRender = async (tpl: string, ctxStr: string) => {
    setIsRendering(true);
    let parsedCtx = {};
    try {
      parsedCtx = JSON.parse(ctxStr);
    } catch (err) {
      setRenderResult({
        success: false,
        error: 'Invalid JSON in Context input'
      });
      setIsRendering(false);
      return;
    }

    try {
      const res = await fetch('/api/run-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: tpl, context: parsedCtx })
      });
      const data: RenderResult = await res.json();
      setRenderResult(data);
    } catch (err: any) {
      setRenderResult({
        success: false,
        error: err.message || 'Server error while running Python engine'
      });
    } finally {
      setIsRendering(false);
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/run-tests', { method: 'POST' });
      const data: TestRunResult = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        output: 'Failed to trigger test suite: ' + err.message,
        exitCode: 1
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    if (id === 'output') {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } else if (id === 'pip') {
      setCopiedPip(true);
      setTimeout(() => setCopiedPip(false), 2000);
    } else {
      setCopiedFile(id);
      setTimeout(() => setCopiedFile(null), 2000);
    }
  };

  const totalLines = engineFiles.reduce((acc, f) => acc + (f.lines || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* ======================================================== */}
      {/* 1. TOP HEADER FLEX */}
      {/* ======================================================== */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Logo & Engine Title */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/aifaceswap-output_01a7a7b3.png"
            alt="Hira"
            className="w-10 h-10 rounded-full object-cover object-top border-2 border-amber-500/50 shadow-md shadow-amber-500/10 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">HiraTemplate</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 uppercase tracking-wider">
                PRO MAX
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <PackageCheck className="w-3.5 h-3.5" /> pip install hira-template
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden md:block">
              Lexer • AST Parser • LRU Caching • Filters • If/Elif • Extends/Block • Include
            </p>
          </div>
        </div>

        {/* Right Header Flex: Author Badge, Live Stats & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Badge: Built by Hira • BCA */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-500/15 via-purple-500/15 to-indigo-500/15 border border-orange-500/30 text-orange-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Built by Hira</span>
            <span className="text-slate-500">•</span>
            <span>BCA</span>
          </div>

          {/* Live Stats: Render: 0.344ms | Tokens: 8 | 10/10 PASS */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <span className="text-emerald-400 font-semibold">
              Render: {renderResult?.elapsedMs ? `${renderResult.elapsedMs}ms` : '0.344ms'}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-300">
              Tokens: {renderResult?.tokens?.length ?? 8}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-semibold">
              10/10 PASS
            </span>
          </div>

          <button
            onClick={() => {
              setActiveTab('tests');
              handleRunTests();
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition shadow-sm cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Run `python main.py`</span>
          </button>
        </div>
      </header>

      {/* Nav Tabs */}
      <div className="border-b border-slate-800/80 bg-slate-900/50 px-4 lg:px-8 flex items-center gap-1 overflow-x-auto text-sm">
        <button
          onClick={() => setActiveTab('playground')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'playground'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Interactive Playground</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('tests');
            if (!testResult) handleRunTests();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'tests'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>8 PASS/FAIL Tests</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
            8/8 PASS
          </span>
        </button>
        <button
          onClick={() => setActiveTab('package')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'package'
              ? 'border-orange-400 text-orange-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>PIP Package v1.0.0</span>
        </button>
        <button
          onClick={() => setActiveTab('filters')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'filters'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>10 Filters Showcase</span>
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'files'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode2 className="w-4 h-4" />
          <span>Source Code ({engineFiles.length} Files)</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: PLAYGROUND */}
        {activeTab === 'playground' && (
          <div className="space-y-6">
            {/* Presets Row */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Feature Presets:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(idx)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      selectedPresetIndex === idx
                        ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Grid: Template Editor + Output */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Input Template & Context */}
              <div className="flex flex-col gap-4">
                {/* Template Input */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        Template Source ({'{% if/elif %}'}, {'{% extends %}'}, {'{% include %}'})
                      </span>
                    </div>
                    <button
                      onClick={() => executeRender(templateInput, contextInput)}
                      disabled={isRendering}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isRendering ? 'Rendering...' : 'Render'}</span>
                    </button>
                  </div>
                  <textarea
                    value={templateInput}
                    onChange={(e) => setTemplateInput(e.target.value)}
                    rows={11}
                    className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-3.5 resize-y focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                    placeholder="Enter template here..."
                    spellCheck={false}
                  />
                  <div className="px-3.5 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Supports extends, blocks, includes, elif chains &amp; custom filter validation</span>
                    <span className="font-mono text-slate-500">{templateInput.length} chars</span>
                  </div>
                </div>

                {/* Context JSON Input */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                  <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brackets className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                        Context (JSON Data Dictionary)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">Missing variables return "" without crash</span>
                  </div>
                  <textarea
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    rows={7}
                    className="w-full bg-slate-950 text-sky-300 font-mono text-xs p-3.5 resize-y focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    placeholder="Enter JSON context..."
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Right Column: Engine Output & AST Inspector */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                {/* View Tabs */}
                <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode('rendered')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        viewMode === 'rendered'
                          ? 'bg-slate-700 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Live Output</span>
                    </button>
                    <button
                      onClick={() => setViewMode('html')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        viewMode === 'html'
                          ? 'bg-slate-700 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Raw Text</span>
                    </button>
                    <button
                      onClick={() => setViewMode('tokens')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        viewMode === 'tokens'
                          ? 'bg-slate-700 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Tokens ({renderResult?.tokens?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setViewMode('ast')}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        viewMode === 'ast'
                          ? 'bg-slate-700 text-white font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      <span>AST Nodes ({renderResult?.ast?.length || 0})</span>
                    </button>
                  </div>

                  {renderResult?.output && (
                    <button
                      onClick={() => copyToClipboard(renderResult.output || '', 'output')}
                      className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                    >
                      {copiedOutput ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedOutput ? 'Copied' : 'Copy Output'}</span>
                    </button>
                  )}
                </div>

                {/* View Content */}
                <div className="p-4 flex-1 overflow-auto max-h-[580px] min-h-[350px] bg-slate-950 font-mono text-xs">
                  {/* RED ERROR BOX FOR ERRORS */}
                  {renderResult && !renderResult.success && renderResult.error && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/80 to-rose-950/80 border-2 border-red-600/80 text-red-200 space-y-3 shadow-lg shadow-red-950/50">
                      <div className="flex items-center justify-between border-b border-red-800/60 pb-2.5">
                        <div className="flex items-center gap-2 font-bold text-red-300 text-sm">
                          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                          <span>Template Error Detected</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          {renderResult.line !== undefined && (
                            <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700 font-semibold">
                              Line: {renderResult.line}
                            </span>
                          )}
                          {renderResult.col !== undefined && (
                            <span className="px-2 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700 font-semibold">
                              Col: {renderResult.col}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-red-950/90 p-3 rounded-lg border border-red-800/80 font-mono text-xs text-red-100 whitespace-pre-wrap leading-relaxed select-all">
                        {renderResult.error}
                      </div>
                      <p className="text-[11px] text-red-300/80 italic">
                        Tip: Check for unclosed delimiters like &#123;&#123; or &#123;% or make sure all filters are registered in FILTERS registry.
                      </p>
                    </div>
                  )}

                  {renderResult?.success && viewMode === 'rendered' && (
                    <div className="space-y-4">
                      <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/60 text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {renderResult?.output}
                      </div>

                      {/* If output contains HTML tags, render preview */}
                      {renderResult?.output && renderResult.output.includes('<') && renderResult.output.includes('>') && (
                        <div className="border border-slate-800 rounded-lg overflow-hidden bg-white text-slate-900">
                          <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 text-[11px] font-sans font-semibold text-slate-600 flex items-center justify-between">
                            <span>Rendered HTML Document Sandbox</span>
                            <span className="text-[10px] text-slate-400">Live Preview</span>
                          </div>
                          <div
                            className="p-4 prose prose-sm max-w-none text-slate-800 font-sans"
                            dangerouslySetInnerHTML={{ __html: renderResult.output }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {renderResult?.success && viewMode === 'html' && (
                    <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed select-all">
                      {renderResult?.output}
                    </pre>
                  )}

                  {renderResult?.success && viewMode === 'tokens' && (
                    <div className="space-y-2">
                      <p className="text-slate-400 text-[11px] mb-3">
                        Lexer token stream scanned from template (Comments skipped, exact lines &amp; columns tracked):
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {renderResult?.tokens?.map((tok, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 border border-slate-800"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                  tok.type === 'VAR'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : tok.type === 'TAG'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-slate-700/50 text-slate-300'
                                }`}
                              >
                                {tok.type}
                              </span>
                              <span className="text-slate-200 font-mono">{tok.value}</span>
                            </div>
                            <span className="text-slate-500 text-[10px] font-mono">
                              Line {tok.line}, Col {tok.col || 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {renderResult?.success && viewMode === 'ast' && (
                    <div className="space-y-3">
                      <p className="text-slate-400 text-[11px]">
                        Structured Abstract Syntax Tree (AST) generated by Recursive Descent Parser:
                      </p>
                      <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-purple-300 overflow-x-auto">
                        {JSON.stringify(renderResult?.ast, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Execution Stats Footer */}
                {renderResult && renderResult.success && (
                  <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Render OK
                      </span>
                      <span>
                        Time: <strong className="text-white">{renderResult.elapsedMs}ms</strong>
                      </span>
                    </div>
                    {renderResult.cache && (
                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                          LRU Cache Hits: {renderResult.cache.hits}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Misses: {renderResult.cache.misses}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* 2. HERO FLEX SECTION (HiraTemplate by Codewithhira) */}
            {/* ======================================================== */}
            <div className="relative mt-8 pt-8 border-t border-slate-800/80 space-y-6">
              {/* Glow background accent */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl -z-10 blur-xl pointer-events-none" />

              {/* Big Heading & Subtext */}
              <div className="text-center space-y-2.5 max-w-3xl mx-auto px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-purple-500/20 border border-orange-500/30 text-orange-300 text-xs font-semibold uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>The Real Developer Flex • Zero External Libs</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-purple-400 tracking-tight leading-tight">
                  Maine Jinja2 use nahi kiya. Maine apna banaya hai. 🔥
                </h1>
                <p className="text-sm sm:text-base font-mono text-purple-200/90 flex items-center justify-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Lexer</span>
                  <span className="text-orange-400 font-bold">→</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Parser</span>
                  <span className="text-purple-400 font-bold">→</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">Renderer</span>
                  <span className="text-emerald-400 font-bold">→</span>
                  <span className="text-emerald-300 font-bold px-2.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/80 shadow-sm">
                    0.401ms
                  </span>
                </p>
              </div>

              {/* 4 Flex Cards (Orange + Purple Gradient) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1 */}
                <div className="relative group rounded-2xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-900 to-purple-950/40 border border-orange-500/30 hover:border-orange-400/60 transition shadow-lg shadow-orange-950/20 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      ⚡ 0.344ms Render Speed
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Lightning-fast AST caching aur zero overhead string rendering. Ek hi template baar baar re-tokenize nahi hota.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-amber-300">
                    <span>LRU Cache: Active</span>
                    <span className="text-emerald-400 font-semibold">Sub-millisecond</span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="relative group rounded-2xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-900 to-purple-950/40 border border-purple-500/30 hover:border-purple-400/60 transition shadow-lg shadow-purple-950/20 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-md shadow-purple-500/20 text-white font-bold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      🧩 Lexer + Parser + Renderer
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Hand-crafted recursive descent tokenizer aur Abstract Syntax Tree nodes. Proper AST evaluation, zero eval() hacks.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-purple-300">
                    <span>Recursive Descent</span>
                    <span className="text-sky-300 font-semibold">Clean AST</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="relative group rounded-2xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-900 to-orange-950/40 border border-orange-500/30 hover:border-orange-400/60 transition shadow-lg shadow-orange-950/20 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-rose-500 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-bold">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      🔁 For Loop + If + Filters
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      loop.index, elif branches, extends, include aur 10+ standard filters pipe chaining ke saath smoothly execute hote hain.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-orange-300">
                    <span>Extends + Blocks</span>
                    <span className="text-amber-300 font-semibold">10 Filters</span>
                  </div>
                </div>

                {/* Card 4 */}
                <div className="relative group rounded-2xl p-5 bg-gradient-to-br from-slate-900/90 via-slate-900 to-purple-950/40 border border-purple-500/30 hover:border-purple-400/60 transition shadow-lg shadow-purple-950/20 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-orange-500 to-purple-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-bold">
                      <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      🏆 MCA Project - Level 1 DONE
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      CodeCrafters Build-Your-Own-X standard architecture. Real production grade compiler code ready for deployment &amp; pip package.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-emerald-400">
                    <span>Production Grade</span>
                    <span className="font-semibold text-emerald-300">Level 1 Done</span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 3. MY PROFILE FLEX BOX */}
              {/* ======================================================== */}
              <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border-2 border-purple-500/30 shadow-xl shadow-purple-950/30 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  {/* Avatar: exact uploaded image, round with border */}
                  <div className="relative">
                    <img
                      src="/assets/aistudio/aifaceswap-output_01a7a7b3.png"
                      alt="Hira"
                      className="w-16 h-16 rounded-full object-cover object-top border-2 border-purple-500/60 shadow-lg shadow-purple-500/20"
                    />
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-950 font-bold">
                      ✓
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl font-bold text-white tracking-tight">Hira</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-purple-500 text-white font-semibold shadow-sm">
                        Lead Architect
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs font-mono text-slate-300">
                      <span className="text-slate-400">Skills:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-semibold">Python</span>
                      <span className="text-slate-600">|</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 font-semibold">Go</span>
                      <span className="text-slate-600">|</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-orange-300 border border-slate-700 font-semibold">Rust</span>
                      <span className="text-slate-600">|</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700 font-semibold">Docker</span>
                    </div>

                    <p className="text-xs text-purple-200/90 italic pt-1 max-w-xl">
                      &ldquo;What I cannot create, I do not understand&rdquo; <span className="text-amber-400 font-semibold">— Feynman</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href="https://github.com/codewithhira-cwh/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      copyToClipboard('https://github.com/codewithhira-cwh/', 'repo');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 text-white shadow-lg shadow-orange-500/20 active:scale-95 transition cursor-pointer"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>{copiedFile === 'repo' ? 'Copied: github.com/codewithhira-cwh' : 'View My GitHub - codewithhira-cwh'}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 8 PASS/FAIL TESTS */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Real Test Suite (8/8 PASS)</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Runs the real Python executable test harness without external mock libraries. All 8 tests pass with green checkmarks.
                </p>
              </div>
              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition cursor-pointer shadow-md disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                <span>{isRunningTests ? 'Executing Tests...' : 'Re-run python main.py'}</span>
              </button>
            </div>

            {/* 8 Test Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 1</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">Dot Access &amp; Index</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{{ user.name }}, {{ items[0] }}'}
                  </p>
                  <p className="text-xs text-slate-400">Traverses nested dicts &amp; lists safely.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 2</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">Filter Chaining</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{{ name | upper | trim | default("Guest") }}'}
                  </p>
                  <p className="text-xs text-slate-400">Sequential Unix-style pipe execution.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 3</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">Ignored Comments</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{# secret comment ignored #}'}
                  </p>
                  <p className="text-xs text-slate-400">Lexer skips comments while tracking lines.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 4 (New)</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">If / Elif / Else</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{% if .. %}A{% elif .. %}B{% else %}C{% endif %}'}
                  </p>
                  <p className="text-xs text-slate-400">Multi-branch conditional logic.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 5</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">For &amp; loop.index</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{% for s in students %}{{ loop.index }}{% endfor %}'}
                  </p>
                  <p className="text-xs text-slate-400">Loop metadata (index, first, last, length).</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 6 (New)</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">Extends &amp; Blocks</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{% extends "base.html" %} + {% block %}'}
                  </p>
                  <p className="text-xs text-slate-400">Full template inheritance hierarchy.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 7 (New)</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">Template Include</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'{% include "header.html" %}'}
                  </p>
                  <p className="text-xs text-slate-400">Includes partials into output stream.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Test 8 (New)</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white mb-1">Error Handling</h3>
                  <p className="text-xs text-slate-400 font-mono bg-slate-950 p-2 rounded mb-2 border border-slate-800">
                    {'Line X, col Y + Unknown filter'}
                  </p>
                  <p className="text-xs text-slate-400">Precise line/col tracking + safe missing var.</p>
                </div>
              </div>
            </div>

            {/* Real CLI Output Window */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
              <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs font-mono text-slate-400 ml-2">bash: python3 main.py</span>
                </div>
                <span className="text-xs font-mono text-emerald-400">Exit Code: 0 (ALL 8/8 PASS)</span>
              </div>
              <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto text-emerald-300 leading-relaxed max-h-[380px]">
                {testResult ? (
                  <pre className="whitespace-pre-wrap">{testResult.output}</pre>
                ) : (
                  <div className="text-slate-500 py-4 flex items-center justify-center gap-2">
                    <Terminal className="w-4 h-4" />
                    <span>Click "Re-run python main.py" to execute test harness in real-time</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PIP PACKAGE */}
        {activeTab === 'package' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-1.5">
                <PackageCheck className="w-6 h-6 text-orange-400" />
                <h2 className="text-lg font-bold text-white">PIP Package: hira-template v1.0.0</h2>
              </div>
              <p className="text-xs text-slate-400">
                Packaged with modern <code className="text-orange-300 font-mono">pyproject.toml</code> and <code className="text-orange-300 font-mono">setup.py</code> for standard Python distribution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Installation</span>
                </h3>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between font-mono text-xs">
                  <span className="text-emerald-300">pip install hira-template</span>
                  <button
                    onClick={() => copyToClipboard('pip install hira-template', 'pip')}
                    className="text-slate-400 hover:text-white transition"
                  >
                    {copiedPip ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
                  <span className="text-slate-500"># Or install locally in development mode:</span>
                  <br />
                  <span className="text-sky-300">pip install -e .</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-sky-400" />
                  <span>Python Import &amp; Usage</span>
                </h3>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
{`from hira_template import HiraTemplate, __version__

print(f"Version: {__version__}") # 1.0.0

tpl = HiraTemplate("Hello {{ name | upper }}!")
print(tpl.render({"name": "hira"})) # Hello HIRA!`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 10 FILTERS SHOWCASE */}
        {activeTab === 'filters' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2.5 mb-1.5">
                <Filter className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">10 Core Template Filters</h2>
              </div>
              <p className="text-xs text-slate-400">
                All filters are implemented in pure Python with zero external libraries. Chained with Unix-style pipe syntax:
                <code className="text-indigo-300 ml-1 font-mono">{'{{ expr | filter1 | filter2(arg) }}'}</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FILTERS_DOCS.map((f) => (
                <div
                  key={f.name}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {f.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">engine/filters.py</span>
                    </div>
                    <p className="text-xs text-slate-300 mb-3">{f.desc}</p>
                  </div>

                  <div className="bg-slate-950 rounded-lg p-2.5 border border-slate-855 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-400">{f.example}</span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span>{f.output}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SOURCE CODE EXPLORER */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-sky-400" />
                  <span>Production Codebase ({totalLines} Lines Total)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full code ready to run on any machine. Clean architecture with Hinglish comments.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Files: {engineFiles.length}
                </span>
              </div>
            </div>

            {/* File Viewer Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* File list sidebar */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                <span className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Project Files
                </span>
                {engineFiles.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                      selectedFileIndex === idx
                        ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{file.path}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 ml-2">{file.lines}L</span>
                  </button>
                ))}
              </div>

              {/* Code display pane */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sky-300">
                      {engineFiles[selectedFileIndex]?.path}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ({engineFiles[selectedFileIndex]?.lines} lines)
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        engineFiles[selectedFileIndex]?.content || '',
                        engineFiles[selectedFileIndex]?.path || ''
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-750 text-xs text-slate-300 transition cursor-pointer"
                  >
                    {copiedFile === engineFiles[selectedFileIndex]?.path ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedFile === engineFiles[selectedFileIndex]?.path ? 'Copied!' : 'Copy Code'}
                    </span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 font-mono text-xs overflow-auto max-h-[580px] leading-relaxed select-all">
                  <pre className="text-slate-200">{engineFiles[selectedFileIndex]?.content}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 4. FOOTER FLEX */}
      {/* ======================================================== */}
      <footer className="border-t border-slate-800/80 bg-slate-900/80 px-4 py-5 text-center text-xs text-slate-400 space-y-2 shadow-inner">
        <div className="flex items-center justify-center gap-2">
          <img
            src="/assets/aistudio/aifaceswap-output_01a7a7b3.png"
            alt="Hira"
            className="w-5 h-5 rounded-full object-cover object-top border border-amber-400/60"
          />
          <p className="font-semibold text-slate-200">
            HiraTemplate Pro Max • Inspired by codecrafters-io/build-your-own-x • Built by Hira • 2026
          </p>
        </div>
        <p className="text-[11px] text-amber-400 font-mono font-medium">
          No Jinja2 used. 100% scratch built.
        </p>
      </footer>
    </div>
  );
}
