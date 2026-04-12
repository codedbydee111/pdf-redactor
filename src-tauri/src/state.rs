use std::collections::HashMap;
use std::sync::Mutex;

/// Holds metadata about currently open documents. Documents are loaded from
/// their file path on each operation because MuPDF's PdfDocument is !Send.
pub struct AppState {
    pub documents: Mutex<HashMap<String, DocumentMeta>>,
    next_id: Mutex<u64>,
}

pub struct DocumentMeta {
    pub path: String,
    pub page_count: u32,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            documents: Mutex::new(HashMap::new()),
            next_id: Mutex::new(1),
        }
    }

    pub fn next_document_id(&self) -> String {
        let mut id = self.next_id.lock().unwrap();
        let current = *id;
        *id += 1;
        format!("doc_{current}")
    }
}
