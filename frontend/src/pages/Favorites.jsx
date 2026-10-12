import { useEffect, useState } from 'react';
import api from '../api/axios';
import ResourceCard from '../components/ResourceCard';
import SearchInput from '../components/SearchInput';

export default function Favorites() {
  const [bookmarks, setBookmarks] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/bookmarks').then((res) => setBookmarks(res.data.bookmarks));
  }, []);

  const filtered = bookmarks.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h3 className="fw-bold mb-4">My Favorites</h3>
      <SearchInput value={q} onChange={setQ} placeholder="Search your favorites..." />
      {filtered.length === 0 ? (
        <p className="text-muted">{bookmarks.length === 0 ? "You haven't bookmarked anything yet." : 'No matches.'}</p>
      ) : (
        <div className="row">
          {filtered.map((r) => <ResourceCard key={r.bookmark_id} resource={r} />)}
        </div>
      )}
    </>
  );
}
