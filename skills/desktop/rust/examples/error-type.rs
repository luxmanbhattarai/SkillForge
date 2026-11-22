use thiserror::Error;

#[derive(Debug, Error)]
pub enum NoteError {
    #[error("note {0} not found")]
    NotFound(u64),
    #[error("storage error: {0}")]
    Storage(#[from] std::io::Error),
}

fn load_note(id: u64) -> Result<String, NoteError> {
    if id == 0 {
        return Err(NoteError::NotFound(id));
    }
    let path = format!("notes/{id}.md");
    Ok(std::fs::read_to_string(path)?)
}
