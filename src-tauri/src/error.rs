use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("PDF error: {0}")]
    Pdf(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("MuPDF error: {0}")]
    MuPdf(#[from] mupdf::Error),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
