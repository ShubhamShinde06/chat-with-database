import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000/api";
const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const SUGGESTIONS = [
  "Show all tables overview",
  "Count total records in each table",
  "Show recent 10 records",
  "Find duplicate entries",
];

export default function App() {
  const [dark, setDark]         = useState(true);
  const [connStr, setConnStr]   = useState("");
  const [schema, setSchema]     = useState(null);
  const [tables, setTables]     = useState([]);
  const [msgs, setMsgs]         = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [connErr, setConnErr]   = useState("");
  const [connecting, setConnecting] = useState(false);
  const [sideOpen, setSideOpen] = useState(true);
  const bottomRef = useRef(null);

  const d = dark;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const handleConnect = async () => {
    setConnErr(""); setConnecting(true);
    try {
      const { data } = await axios.post(`${API}/connect`, { connectionString: connStr });
      setSchema(data.schema); setTables(data.tables);
      setMsgs([{ role: "system", text: `Connected — ${data.tables.length} tables loaded`, ts: ts() }]);
    } catch (err) { setConnErr(err.response?.data?.error || err.message); }
    setConnecting(false);
  };

  const handleSend = async (q) => {
    const question = (q || input).trim();
    if (!question || loading) return;
    setInput("");
    setMsgs(p => [...p, { role: "user", text: question, ts: ts() }]);
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/query`, { connectionString: connStr, schema, question });
      setMsgs(p => [...p, { role: "assistant", ...data, ts: ts() }]);
    } catch (err) {
      setMsgs(p => [...p, { role: "error", text: err.response?.data?.error || err.message, sql: err.response?.data?.sql || "", ts: ts() }]);
    }
    setLoading(false);
  };

  const dbName = (() => { try { return new URL(connStr).pathname.replace("/", "") || "database"; } catch { return "database"; } })();

  // ── theme tokens ──────────────────────────────────────────────────────────
  const bg     = d ? "bg-[#0f0f13]"      : "bg-[#f4f4f8]";
  const panel  = d ? "bg-[#17171f]"      : "bg-white";
  const card   = d ? "bg-[#1e1e2a]"      : "bg-[#f9f9fb]";
  const border = d ? "border-white/8"    : "border-black/8";
  const txt    = d ? "text-white"        : "text-[#0f0f13]";
  const muted  = d ? "text-white/40"     : "text-black/40";
  const sub    = d ? "text-white/60"     : "text-black/60";
  const inputBg= d ? "bg-[#0f0f13]"     : "bg-white";
  const accent = "bg-violet-600 hover:bg-violet-500";
  const pill   = d ? "bg-white/8 text-white/70" : "bg-black/6 text-black/60";

  // ── connect screen ────────────────────────────────────────────────────────
  if (!schema) return (
    <div className={`min-h-screen ${bg} flex flex-col`}>
      <nav className={`${panel} border-b ${border} px-6 h-14 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>
          </div>
          <span className={`font-semibold text-sm ${txt}`}>SQL AI Agent</span>
        </div>
        <button onClick={() => setDark(!d)} className={`w-8 h-8 rounded-lg ${card} border ${border} flex items-center justify-center ${sub} hover:${txt} transition-colors`}>
          {d ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
        </button>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`w-full max-w-md ${panel} border ${border} rounded-2xl p-8`}>
          <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center mb-5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>
          </div>
          <h1 className={`text-xl font-semibold ${txt} mb-1`}>Connect your database</h1>
          <p className={`text-sm ${sub} mb-6`}>Paste your MySQL connection string to start chatting with your data in plain English.</p>

          <label className={`text-xs font-medium ${sub} uppercase tracking-wider block mb-2`}>MySQL connection string</label>
          <input
            className={`w-full ${inputBg} border ${border} rounded-xl px-4 py-3 text-sm font-mono ${txt} outline-none focus:border-violet-500 transition-colors mb-4`}
            value={connStr} onChange={e => setConnStr(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConnect()}
            placeholder="mysql://user:password@localhost:3306/dbname"
          />

          {connErr && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{connErr}</div>
          )}

          <button onClick={handleConnect} disabled={connecting || !connStr.trim()}
            className={`w-full ${accent} disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2`}>
            {connecting ? <><Spin/>Connecting...</> : <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Connect &amp; load schema
            </>}
          </button>

          <div className={`mt-4 rounded-xl ${card} border ${border} px-4 py-3`}>
            <p className={`text-xs ${muted} leading-relaxed`}>
              <span className={`font-medium ${sub}`}>Format: </span>
              <code className="font-mono">mysql://user:pass@host:3306/dbname</code><br/>
              Your connection string is used only for this session and never stored.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── main app ──────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen flex flex-col ${bg} overflow-hidden`}>

      {/* topbar */}
      <nav className={`${panel} border-b ${border} px-4 h-14 flex items-center gap-3 flex-shrink-0`}>
        <button onClick={() => setSideOpen(!sideOpen)} className={`w-8 h-8 rounded-lg ${card} border ${border} flex items-center justify-center ${sub} transition-colors hover:text-violet-400`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>
        </div>
        <span className={`font-semibold text-sm ${txt}`}>SQL AI Agent</span>
        <div className="flex items-center gap-1.5 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span className={`text-xs ${sub}`}>{dbName}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setDark(!d)} className={`w-8 h-8 rounded-lg ${card} border ${border} flex items-center justify-center ${sub} hover:text-violet-400 transition-colors`}>
            {d ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
          </button>
          <button onClick={() => { setSchema(null); setTables([]); setMsgs([]); }}
            className={`h-8 px-3 rounded-lg ${card} border ${border} text-xs ${sub} hover:text-red-400 transition-colors`}>
            Disconnect
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* sidebar */}
        {sideOpen && (
          <aside className={`w-56 flex-shrink-0 ${panel} border-r ${border} flex flex-col overflow-hidden`}>
            <div className={`px-4 py-3 border-b ${border}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${muted}`}>Tables · {tables.length}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {tables.map(tbl => (
                <button key={tbl} onClick={() => handleSend(`Show first 20 rows of ${tbl} table`)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-violet-500/10 group transition-colors`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-violet-400 flex-shrink-0"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                  <span className={`text-xs ${sub} group-hover:text-violet-400 transition-colors truncate font-mono`}>{tbl}</span>
                  <span className={`ml-auto text-[10px] ${muted} flex-shrink-0`}>{schema[tbl]?.length}c</span>
                </button>
              ))}
            </div>
            <div className={`border-t ${border} p-3`}>
              <button onClick={() => handleSend("Show all tables with row counts")}
                className={`w-full text-xs ${sub} hover:text-violet-400 py-2 flex items-center justify-center gap-1.5 transition-colors`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Ask about all tables
              </button>
            </div>
          </aside>
        )}

        {/* chat */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {msgs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center gap-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <div>
                  <p className={`font-semibold ${txt} mb-1`}>Ask anything about your data</p>
                  <p className={`text-sm ${sub}`}>Type in plain English — AI writes the SQL and runs it for you</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => handleSend(s)}
                      className={`text-xs ${pill} px-3 py-2 rounded-xl border ${border} hover:border-violet-500/40 hover:text-violet-400 transition-colors`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => {
              if (m.role === "system") return (
                <div key={i} className="flex justify-center">
                  <span className={`text-xs ${muted} ${card} border ${border} px-3 py-1.5 rounded-full`}>{m.text}</span>
                </div>
              );
              if (m.role === "user") return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[65%]">
                    <div className="bg-violet-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-br-md leading-relaxed">{m.text}</div>
                    <p className={`text-[10px] ${muted} text-right mt-1`}>{m.ts}</p>
                  </div>
                </div>
              );
              if (m.role === "error") return (
                <div key={i} className="flex justify-start">
                  <div className={`max-w-[85%] rounded-2xl rounded-bl-md border border-red-500/20 bg-red-500/8 overflow-hidden`}>
                    <div className="px-4 py-3">
                      <p className="text-red-400 text-xs font-medium mb-1">Query failed</p>
                      {m.sql && <code className={`text-xs font-mono ${muted} block mb-2`}>{m.sql}</code>}
                      <p className="text-red-300 text-sm">{m.text}</p>
                    </div>
                  </div>
                </div>
              );
              if (m.role === "assistant") {
                const cols = m.columns || (m.rows?.length ? Object.keys(m.rows[0]) : []);
                return (
                  <div key={i} className="flex justify-start">
                    <div className={`max-w-[92%] w-full ${panel} border ${border} rounded-2xl rounded-bl-md overflow-hidden`}>
                      {/* SQL pill */}
                      <div className={`px-4 py-3 border-b ${border} ${card} flex items-start gap-2`}>
                        <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mt-0.5 flex-shrink-0">SQL</span>
                        <code className={`text-xs font-mono ${sub} leading-relaxed break-all`}>{m.sql}</code>
                      </div>
                      {/* explanation */}
                      {m.explanation && (
                        <div className={`px-4 py-2.5 border-b ${border} flex items-center gap-2`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <p className={`text-xs ${sub}`}>{m.explanation}</p>
                        </div>
                      )}
                      {/* results table */}
                      {m.rows?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={`${card} border-b ${border}`}>
                                {cols.map(c => <th key={c} className={`text-left px-4 py-2.5 font-medium ${muted} uppercase tracking-wider whitespace-nowrap`}>{c}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {m.rows.map((r, ri) => (
                                <tr key={ri} className={`border-b ${border} last:border-0 hover:bg-violet-500/5 transition-colors`}>
                                  {cols.map(c => <td key={c} className={`px-4 py-2.5 ${sub} font-mono whitespace-nowrap`}>{String(r[c] ?? "—")}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className={`px-4 py-2 flex items-center justify-between border-t ${border}`}>
                            <span className={`text-[10px] ${muted}`}>{m.rows.length} row{m.rows.length !== 1 ? "s" : ""}</span>
                            <span className={`text-[10px] ${muted}`}>{m.ts}</span>
                          </div>
                        </div>
                      ) : (
                        <div className={`px-4 py-3 text-xs ${muted}`}>No rows returned.</div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })}

            {loading && (
              <div className="flex justify-start">
                <div className={`${panel} border ${border} rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2.5`}>
                  <Spin color="text-violet-400" />
                  <span className={`text-xs ${sub}`}>Generating SQL and querying database…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* input bar */}
          <div className={`${panel} border-t ${border} px-4 py-3`}>
            {/* suggestion chips */}
            {msgs.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => handleSend(s)}
                    className={`flex-shrink-0 text-xs ${pill} px-3 py-1.5 rounded-xl border ${border} hover:border-violet-500/40 hover:text-violet-400 transition-colors whitespace-nowrap`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div className={`flex gap-2 items-end ${inputBg} border ${border} rounded-2xl px-4 py-3 focus-within:border-violet-500/60 transition-colors`}>
              <textarea
                rows={1}
                className={`flex-1 bg-transparent text-sm ${txt} outline-none resize-none placeholder:${muted} leading-relaxed`}
                style={{ maxHeight: 120 }}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask anything about your database…"
              />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <p className={`text-[10px] ${muted} text-center mt-2`}>Press Enter to send · Shift+Enter for new line</p>
          </div>
        </main>
      </div>
    </div>
  );
}

function Spin({ color = "text-white" }) {
  return (
    <svg className={`animate-spin ${color}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
    </svg>
  );
}