import { useState } from 'react';

export function SearchBox({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query);
      }}
    >
      <label htmlFor="search">Search articles</label>
      <input
        id="search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
