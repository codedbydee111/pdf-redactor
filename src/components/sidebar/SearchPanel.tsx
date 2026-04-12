import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Search, X, Trash2, FileSearch, ChevronRight, Shield } from "lucide-react";
import { useAppStore } from "../../lib/store";
import { useTauriCommands } from "../../hooks/useTauriCommands";

export function SearchPanel() {
  const {
    docId, pageCount, searchQuery, setSearchQuery,
    searchResults, setSearchResults, redactions, removeRedaction,
    addRedaction, setCurrentPage,
  } = useAppStore();
  const commands = useTauriCommands();
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [width, setWidth] = useState(300);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setWidth(Math.max(260, Math.min(480, startW.current + (startX.current - ev.clientX))));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!docId || !searchQuery.trim()) return;
    setSearching(true); setHasSearched(true);
    const results: typeof searchResults = [];
    try {
      for (let p = 0; p < pageCount; p++) {
        const pt = await commands.extractText(docId, p);
        for (const b of pt.blocks)
          if (b.text.toLowerCase().includes(searchQuery.toLowerCase()))
            results.push({ page: p, text: b.text, x: b.x, y: b.y, width: b.width, height: b.height });
      }
      setSearchResults(results);
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  }, [docId, pageCount, searchQuery, commands, setSearchResults]);

  const redactAll = useCallback(() => {
    for (const r of searchResults)
      addRedaction({ page: r.page, x: r.x, y: r.y, width: r.width, height: r.height, source: "search" });
    setSearchResults([]); setSearchQuery(""); setHasSearched(false);
  }, [searchResults, addRedaction, setSearchResults, setSearchQuery]);

  const grouped = useMemo(() => {
    const m = new Map<number, typeof redactions>();
    for (const r of redactions) { const l = m.get(r.page) ?? []; l.push(r); m.set(r.page, l); }
    return Array.from(m.entries()).sort(([a], [b]) => a - b);
  }, [redactions]);

  return (
    <aside style={{
      flexShrink: 0, display: "flex", position: "relative",
      width, background: "#fff", borderLeft: "1px solid var(--gray-200)",
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        style={{ position: "absolute", left: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 10 }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(79,70,229,0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* ── Search header ── */}
        <div style={{ padding: 20, paddingBottom: 16, borderBottom: "1px solid var(--gray-100)" }}>
          <p style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 16,
          }}>
            Find & Redact
          </p>

          <div style={{
            display: "flex", alignItems: "center", height: 36, borderRadius: 8,
            overflow: "hidden", border: "1px solid var(--gray-200)", background: "var(--gray-50)",
          }}>
            <Search size={14} strokeWidth={1.8} style={{ marginLeft: 12, flexShrink: 0, color: "var(--gray-300)" }} />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search text across all pages..."
              style={{
                flex: 1, height: "100%", padding: "0 10px", fontSize: 12,
                background: "transparent", outline: "none", color: "var(--gray-800)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); setHasSearched(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: "100%", color: "var(--gray-300)", transition: "color 100ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--gray-600)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--gray-300)"; }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {searchQuery && !hasSearched && (
            <p style={{ fontSize: 11, marginTop: 10, color: "var(--gray-400)" }}>
              Press <span style={{ fontWeight: 600 }}>Enter</span> to search
            </p>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {searchResults.length > 0 && (
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionLabel>Results</SectionLabel>
                <CountBadge color="brand">{searchResults.length}</CountBadge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(r.page)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8,
                      transition: "background 75ms",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--gray-50)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      flexShrink: 0, width: 24, height: 20,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                      borderRadius: 4, background: "var(--gray-100)", color: "var(--gray-500)",
                    }}>
                      {r.page + 1}
                    </span>
                    <span style={{
                      flex: 1, fontSize: 12, lineHeight: 1.5, color: "var(--gray-700)",
                      overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    }}>
                      {r.text.trim()}
                    </span>
                    <ChevronRight size={12} style={{ flexShrink: 0, color: "var(--gray-300)" }} />
                  </button>
                ))}
              </div>

              <button
                onClick={redactAll}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "100%", height: 36, borderRadius: 8,
                  fontSize: 12, fontWeight: 600, color: "#fff",
                  background: "var(--brand-600)", transition: "all 100ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--brand-500)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--brand-600)"; }}
              >
                Redact all {searchResults.length} matches
              </button>
            </div>
          )}

          {hasSearched && searchResults.length === 0 && !searching && (
            <EmptyState icon={<FileSearch size={24} strokeWidth={1.3} />} title="No matches found" subtitle="Try a different search term" />
          )}

          {!hasSearched && searchResults.length === 0 && !searching && redactions.length === 0 && (
            <EmptyState icon={<Shield size={24} strokeWidth={1.3} />} title="Find sensitive text" subtitle="Search across all pages to locate and redact content" />
          )}

          {searching && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 0", textAlign: "center" }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid var(--gray-200)", borderTopColor: "var(--brand-600)",
                animation: "spin 0.6s linear infinite", marginBottom: 12,
              }} />
              <p style={{ fontSize: 11, fontWeight: 500, color: "var(--gray-400)" }}>Searching...</p>
            </div>
          )}

          {redactions.length > 0 && (
            <div style={{ padding: 20, borderTop: "1px solid var(--gray-100)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <SectionLabel>Pending</SectionLabel>
                <CountBadge color="redact">{redactions.length}</CountBadge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {grouped.map(([page, items]) => (
                  <div key={page}>
                    <p style={{
                      fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                      letterSpacing: "0.06em", color: "var(--gray-300)", marginBottom: 8,
                    }}>
                      Page {page + 1}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {items.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            height: 32, padding: "0 10px", borderRadius: 6, transition: "background 75ms",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "var(--gray-50)";
                            const btn = e.currentTarget.querySelector<HTMLElement>("[data-delete]");
                            if (btn) btn.style.opacity = "1";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "transparent";
                            const btn = e.currentTarget.querySelector<HTMLElement>("[data-delete]");
                            if (btn) btn.style.opacity = "0";
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: "var(--redact-500)" }} />
                            <span style={{ fontSize: 12, color: "var(--gray-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.source === "search" ? "Text match" : r.source === "selection" ? "Selection" : "Manual"}
                            </span>
                            <span style={{ fontSize: 10, fontVariantNumeric: "tabular-nums", flexShrink: 0, color: "var(--gray-300)" }}>
                              {Math.round(r.width)}×{Math.round(r.height)}
                            </span>
                          </div>
                          <button
                            data-delete
                            onClick={() => removeRedaction(r.id)}
                            style={{ opacity: 0, padding: 4, color: "var(--gray-300)", transition: "opacity 75ms, color 75ms" }}
                            onMouseEnter={e => { e.currentTarget.style.color = "var(--redact-600)"; }}
                            onMouseLeave={e => { e.currentTarget.style.color = "var(--gray-300)"; }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)" }}>
      {children}
    </p>
  );
}

function CountBadge({ children, color }: { children: React.ReactNode; color: "brand" | "redact" }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums",
      padding: "2px 6px", borderRadius: 10, lineHeight: 1,
      background: color === "brand" ? "var(--brand-100)" : "var(--redact-100)",
      color: color === "brand" ? "var(--brand-600)" : "var(--redact-700)",
    }}>
      {children}
    </span>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 32px", textAlign: "center" }}>
      <div style={{ marginBottom: 12, color: "var(--gray-300)" }}>{icon}</div>
      <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: "var(--gray-400)" }}>{title}</p>
      <p style={{ fontSize: 11, maxWidth: 180, lineHeight: 1.6, color: "var(--gray-300)" }}>{subtitle}</p>
    </div>
  );
}
