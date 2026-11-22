# Packaging

- Use the src layout (`src/<package>/`). It prevents the classic
  failure of tests importing the local source tree instead of the
  installed package.
- Declare all metadata in `pyproject.toml` under `[project]`
  (PEP 621): `name`, `version`, `description`, `requires-python`,
  `dependencies`, `license`, `authors`, and `urls`. Do not use
  `setup.py` or `setup.cfg` for new packages.
- Declare the build backend in `[build-system]`. For hatchling:

  ```toml
  [build-system]
  requires = ["hatchling >= 1.33"]
  build-backend = "hatchling.build"
  ```

- Pin the minimum supported Python with `requires-python`
  (for example `>=3.11`) and test every supported minor version in
  CI. Never support a Python version that has reached end of life.
- Ship a `py.typed` marker file in the package so consumers' type
  checkers use the SDK's inline annotations. Without it, the SDK is
  untyped for everyone who installs it.
