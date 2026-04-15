import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Search, X, Trash2, FileSearch, ChevronRight, Shield, Ban } from "lucide-react";
import { useAppStore } from "../../lib/store";
import { useTauriCommands } from "../../hooks/useTauriCommands";
import type { SearchMatch } from "../../lib/types";

export function SearchPanel() {
  const {
    docId, searchQuery, setSearchQuery,
    searchResults, setSearchResults, redactions, removeRedaction,
    addRedaction, scrollToPage,
  } = useAppStore();
  const commands = useTauriCommands();
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Maps each search match index → the redaction IDs it created.
  // "isRedacted" is derived by checking if those IDs still exist in the store.
  const [matchIdMap, setMatchIdMap] = useState<Map<number, string[]>>(new Map());

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

  // Debounced live search: fires 250ms after the user stops typing.
  const searchVersion = useRef(0);
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!docId || !trimmed) {
      if (hasSearched) { setSearchResults([]); setHasSearched(false); }
      return;
    }
    const version = ++searchVersion.current;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await commands.searchText(docId, trimmed);
        if (searchVersion.current !== version) return; // stale
        setSearchResults(results);
        setHasSearched(true);
        setMatchIdMap(new Map());
      } catch (e) {
        if (searchVersion.current === version) {
          console.error("Search failed:", e);
          setSearchResults([]);
          setHasSearched(true);
        }
      } finally {
        if (searchVersion.current === version) setSearching(false);
      }
    }, 250);
    return () => { clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, searchQuery]);

  // Build a Set of all current redaction IDs for O(1) lookups.
  const redactionIdSet = useMemo(() => new Set(redactions.map(r => r.id)), [redactions]);

  // A match is "redacted" only while every redaction it created still exists.
  const isMatchRedacted = useCallback((index: number): boolean => {
    const ids = matchIdMap.get(index);
    if (!ids || ids.length === 0) return false;
    return ids.every(id => redactionIdSet.has(id));
  }, [matchIdMap, redactionIdSet]);

  const redactMatch = useCallback((match: SearchMatch, index: number) => {
    const ids: string[] = [];
    for (const rect of match.rects) {
      const id = addRedaction({
        page: match.page,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        source: "search",
      });
      ids.push(id);
    }
    setMatchIdMap(prev => new Map(prev).set(index, ids));
  }, [addRedaction]);

  const redactAll = useCallback(() => {
    const updated = new Map(matchIdMap);
    for (let i = 0; i < searchResults.length; i++) {
      if (isMatchRedacted(i)) continue;
      const match = searchResults[i];
      const ids: string[] = [];
      for (const rect of match.rects) {
        const id = addRedaction({
          page: match.page,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          source: "search",
        });
        ids.push(id);
      }
      updated.set(i, ids);
    }
    setMatchIdMap(updated);
  }, [searchResults, matchIdMap, isMatchRedacted, addRedaction]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setMatchIdMap(new Map());
  }, [setSearchQuery, setSearchResults]);

  const unredactedCount = useMemo(
    () => searchResults.filter((_, i) => !isMatchRedacted(i)).length,
    [searchResults, isMatchRedacted],
  );

  const grouped = useMemo(() => {
    const m = new Map<number, typeof redactions>();
    for (const r of redactions) { const l = m.get(r.page) ?? []; l.push(r); m.set(r.page, l); }
    return Array.from(m.entries()).sort(([a], [b]) => a - b);
  }, [redactions]);

  return (
    <aside style={{
      flexShrink: 0, display: "flex", position: "relative",
      width, background: "var(--bg-surface)", borderLeft: "1px solid var(--gray-200)",
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
              placeholder="Search text across all pages..."
              style={{
                flex: 1, height: "100%", padding: "0 10px", fontSize: 12,
                background: "transparent", outline: "none", color: "var(--gray-800)",
              }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
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
                {searchResults.map((match, i) => {
                  const isRedacted = isMatchRedacted(i);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        transition: "background 75ms",
                        opacity: isRedacted ? 0.45 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "var(--gray-50)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Page badge */}
                      <span style={{
                        flexShrink: 0, width: 24, height: 20,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 600, fontVariantNumeric: "tabular-nums",
                        borderRadius: 4, background: "var(--gray-100)", color: "var(--gray-500)",
                      }}>
                        {match.page + 1}
                      </span>

                      {/* Context with highlighted match */}
                      <button
                        onClick={() => scrollToPage(match.page)}
                        style={{
                          flex: 1, textAlign: "left", minWidth: 0,
                          fontSize: 12, lineHeight: 1.5, color: "var(--gray-600)",
                          overflow: "hidden", display: "-webkit-box",
                          WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        }}
                      >
                        {match.context_before && (
                          <span style={{ color: "var(--gray-400)" }}>
                            {match.context_before.length > 20
                              ? "\u2026" + match.context_before.slice(-20)
                              : match.context_before}
                          </span>
                        )}
                        <span style={{
                          fontWeight: 600,
                          color: isRedacted ? "var(--gray-400)" : "var(--gray-800)",
                          textDecoration: isRedacted ? "line-through" : "none",
                          background: isRedacted ? "transparent" : "rgba(79,70,229,0.10)",
                          borderRadius: 2,
                          padding: "0 1px",
                        }}>
                          {match.match_text}
                        </span>
                        {match.context_after && (
                          <span style={{ color: "var(--gray-400)" }}>
                            {match.context_after.length > 20
                              ? match.context_after.slice(0, 20) + "\u2026"
                              : match.context_after}
                          </span>
                        )}
                      </button>

                      {/* Per-match redact button */}
                      {isRedacted ? (
                        <Ban size={14} style={{ flexShrink: 0, color: "var(--gray-300)" }} />
                      ) : (
                        <button
                          onClick={() => redactMatch(match, i)}
                          title="Redact this match"
                          style={{
                            flexShrink: 0, width: 24, height: 24,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: 6, color: "var(--redact-500)",
                            transition: "all 100ms",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "var(--redact-50)";
                            e.currentTarget.style.color = "var(--redact-700)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--redact-500)";
                          }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {unredactedCount > 0 && (
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
                  Redact all {unredactedCount} matches
                </button>
              )}

              {unredactedCount === 0 && (
                <p style={{
                  fontSize: 11, textAlign: "center", padding: "8px 0",
                  color: "var(--gray-400)", fontWeight: 500,
                }}>
                  All matches marked for redaction
                </p>
              )}
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
                          onClick={() => scrollToPage(r.page)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            height: 32, padding: "0 10px", borderRadius: 6, transition: "background 75ms",
                            cursor: "pointer",
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
                              {Math.round(r.width)}\u00d7{Math.round(r.height)}
                            </span>
                          </div>
                          <button
                            data-delete
                            onClick={(e) => { e.stopPropagation(); removeRedaction(r.id); }}
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
