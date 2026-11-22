/// Returns the file stem, or `None` for an empty name.
///
/// ```
/// assert_eq!(crate::stem("notes.md"), Some("notes"));
/// ```
pub fn stem(name: &str) -> Option<&str> {
    name.split('.').next().filter(|s| !s.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_name_has_no_stem() {
        assert_eq!(stem(""), None);
    }
}
