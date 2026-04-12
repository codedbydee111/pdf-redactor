use std::collections::HashMap;
use std::sync::Mutex;

use uuid::Uuid;

/// Holds metadata about currently open documents. Documents are loaded from
/// their file path on each operation because MuPDF's PdfDocument is !Send.
pub struct AppState {
    pub documents: Mutex<HashMap<String, DocumentMeta>>,
}

pub struct DocumentMeta {
    pub path: String,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            documents: Mutex::new(HashMap::new()),
        }
    }

    pub fn next_document_id(&self) -> String {
        Uuid::new_v4().to_string()
    }
}
