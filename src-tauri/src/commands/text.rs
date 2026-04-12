use tauri::State;

use crate::error::{AppError, AppResult};
use crate::pdf::document::load_document;
use crate::pdf::text_extraction::{self, PageText};
use crate::state::AppState;

#[tauri::command]
pub fn extract_text(
    doc_id: String,
    page_num: u32,
    state: State<'_, AppState>,
) -> AppResult<PageText> {
    let docs = state.documents.lock().unwrap();
    let meta = docs
        .get(&doc_id)
        .ok_or_else(|| AppError::Pdf("Document not found".to_string()))?;

    let doc = load_document(&meta.path)?;
    text_extraction::extract_page_text(&doc, page_num as i32)
}
