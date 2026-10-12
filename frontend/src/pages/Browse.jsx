import { useEffect, useState } from 'react';
import api from '../api/axios';
import ResourceCard from '../components/ResourceCard';

// This page is only reachable while logged in - no guest can browse or see
// any book metadata before logging in.
export default function Browse() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ttlmLevels, setTtlmLevels] = useState([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [loading, setLoading] = useState(true);

  // Live search: fires automatically as soon as the person types or changes
  // the category/level, no "Search" button click required. Debounced
  // slightly so we're not firing a request on every single keystroke.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = {};
      if (q) params.q = q;
      if (categoryId) params.category_id = categoryId;
      if (categoryId && levelId) params.ttlm_level_id = levelId;
      api.get('/resources', { params }).then((res) => setResources(res.data.resources)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [q, categoryId, levelId]);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.categories));
    api.get('/ttlm-levels').then((res) => setTtlmLevels(res.data.levels));
  }, []);

  return (
    <>
      <h3 className="fw-bold mb-4">Browse the Library</h3>
      <div className="row g-2 mb-4">
        <div className="col-12 col-md-6">
          <div className="input-group">
            <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
            <input
              className="form-control"
              placeholder="Search by title, author, or subject..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="col-12 col-md-6">
          <select className="form-select" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setLevelId(''); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {categoryId && (
          <div className="col-12 col-md-6">
            <select className="form-select" value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">All TTLM Levels</option>
              {ttlmLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : resources.length === 0 ? (
        <p className="text-muted">No resources found.</p>
      ) : (
        <div className="row">
          {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
        </div>
      )}
    </>
  );
}
