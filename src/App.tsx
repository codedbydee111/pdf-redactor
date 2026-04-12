import { useCallback, useEffect, useState, useRef } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { Upload } from "lucide-react";
import { Toolbar } from "./components/toolbar/Toolbar";
import { PdfViewport } from "./components/pdf-viewport/PdfViewport";
import { SearchPanel } from "./components/sidebar/SearchPanel";
import { Globe } from "./components/landing/Globe";
import { usePdfDocument } from "./hooks/usePdfDocument";
import { useTauriCommands } from "./hooks/useTauriCommands";
import { useAppStore } from "./lib/store";

function App() {
  const { pdfDoc, loading, error, openFile } = usePdfDocument();
  const commands = useTauriCommands();
  const { docId, redactions, undo, redo } = useAppStore();

  const handleExport = useCallback(async () => {
    if (!docId || redactions.length === 0) return;
    const originalName = useAppStore.getState().filePath?.split("/").pop()?.replace(/\.pdf$/i, "") ?? "document";
    const outputPath = await save({
      filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      defaultPath: `${originalName} (Redacted).pdf`,
    });
    if (!outputPath) return;
    try {
      const regions = redactions.map((r) => ({
        page: r.page, x: r.x, y: r.y, width: r.width, height: r.height,
      }));
      const result = await commands.applyRedactions(docId, regions, outputPath, true);
      alert(`Redacted ${result.regions_applied} regions across ${result.pages_affected} pages.`);
    } catch (err) {
      alert(`Redaction failed: ${err}`);
    }
  }, [docId, redactions, commands]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (mod && e.key === "o") { e.preventDefault(); openFile(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, openFile]);

  const isLanding = !pdfDoc;

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: isLanding ? "#0a0a14" : "var(--gray-50)",
    }}>
      <Toolbar onOpen={openFile} onExport={handleExport} loading={loading} dark={isLanding} />

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 16px", height: 32, flexShrink: 0,
          fontSize: 11.5, fontWeight: 500,
          background: "var(--redact-50)", color: "var(--redact-700)",
          borderBottom: "1px solid var(--redact-100)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: "var(--redact-500)",
          }} />
          {error}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {pdfDoc ? (
          <>
            <PdfViewport pdfDoc={pdfDoc} />
            {docId && <SearchPanel />}
          </>
        ) : (
          <EmptyState onOpen={openFile} loading={loading} />
        )}
      </div>
    </div>
  );
}

/* ====================================================================
 *  Typing animation
 * ==================================================================== */

const MESSAGES = [
  "Ready to redact something?",
  "Your documents, your privacy.",
  "What needs redacting today?",
  "Sensitive data? Let's fix that.",
  "Privacy starts here.",
  "No clouds. No online uploads. Just you.",
  "Redact with confidence.",
];

function useTypingAnimation() {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [typing, setTyping] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const msg = MESSAGES[idx];
    if (typing) {
      if (displayed.length < msg.length) {
        timer.current = setTimeout(() => setDisplayed(msg.slice(0, displayed.length + 1)), 40 + Math.random() * 30);
      } else {
        timer.current = setTimeout(() => setTyping(false), 3000);
      }
    } else {
      if (displayed.length > 0) {
        timer.current = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 20);
      } else {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setTyping(true);
      }
    }
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [displayed, typing, idx]);

  return displayed;
}

/* ====================================================================
 *  Empty State
 * ==================================================================== */

function EmptyState({ onOpen, loading }: { onOpen: () => void; loading: boolean }) {
  const typedText = useTypingAnimation();

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#0a0a14" }}>
      <Globe />

      <div style={{
        position: "relative", zIndex: 10, height: "100%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 32px",
      }}>
        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 68 }}>
          <h1
            key={typedText.length}
            style={{
              fontSize: 52, fontWeight: 200, letterSpacing: "-0.03em", whiteSpace: "nowrap",
              color: "rgba(255,255,255,0.88)",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              willChange: "contents",
            }}
          >
            {typedText}
          </h1>
          <span style={{
            display: "inline-block", width: 2, height: 48, flexShrink: 0,
            background: "rgba(255,255,255,0.5)",
            animation: "blink 1s ease-in-out infinite",
            marginLeft: typedText.length > 0 ? 4 : 0,
          }} />
        </div>

        <div style={{ height: 64 }} />

        <button
          onClick={onOpen}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            width: 560, height: 56, borderRadius: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 0 0 0 rgba(79,70,229,0), 0 2px 16px rgba(0,0,0,0.2)",
            transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: loading ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(79,70,229,0.12), 0 4px 24px rgba(0,0,0,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
            e.currentTarget.style.boxShadow = "0 0 0 0 rgba(79,70,229,0), 0 2px 16px rgba(0,0,0,0.2)";
          }}
        >
          <Upload size={20} strokeWidth={1.5} style={{ flexShrink: 0, color: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.35)" }}>
            {loading ? "Opening..." : "Open a PDF file or drop it here..."}
          </span>
        </button>

        <div style={{ flex: 1.4 }} />

        <p style={{
          fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.4)",
          paddingBottom: 24,
          letterSpacing: "0.01em",
        }}>
          A project by Edward (codedbydee111)
        </p>
      </div>
    </div>
  );
}

export default App;
