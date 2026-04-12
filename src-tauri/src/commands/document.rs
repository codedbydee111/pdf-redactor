use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::pdf::document::load_document;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct PageDimensions {
    pub width: f32,
    pub height: f32,
}

#[tauri::command]
pub fn get_page_dimensions(
    doc_id: String,
    page_num: u32,
    state: State<'_, AppState>,
) -> AppResult<PageDimensions> {
    let docs = state.documents.lock().unwrap();
    let meta = docs
        .get(&doc_id)
        .ok_or_else(|| AppError::Pdf("Document not found".to_string()))?;

    let doc = load_document(&meta.path)?;
    let page = doc.load_page(page_num as i32)?;
    let bounds = page.bounds()?;

    Ok(PageDimensions {
        width: bounds.x1 - bounds.x0,
        height: bounds.y1 - bounds.y0,
    })
}
