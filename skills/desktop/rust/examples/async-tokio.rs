use tokio::task;

async fn hash_file(path: &std::path::Path) -> std::io::Result<u64> {
    let path = path.to_path_buf();
    task::spawn_blocking(move || {
        // Blocking file I/O runs on a dedicated thread pool.
        let bytes = std::fs::read(path)?;
        Ok(bytes.iter().fold(0u64, |acc, b| acc.wrapping_add(*b as u64)))
    })
    .await?
}
