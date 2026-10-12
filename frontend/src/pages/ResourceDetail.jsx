import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { assetBase } from '../utils/assetUrl';

// Only reachable while logged in - no guest can see any resource metadata.
export default function ResourceDetail() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    api.get(`/resources/${id}`)
      .then((res) => setResource(res.data.resource))
      .catch((err) => setError(err.response?.data?.message || 'Could not load resource.'));
  }, [id]);

  const toggleBookmark = async () => {
    if (bookmarked) {
      await api.delete(`/bookmarks/${id}`);
      setBookmarked(false);
    } else {
      await api.post(`/bookmarks/${id}`);
      setBookmarked(true);
    }
  };

  // Uses axios (not a plain <a href>) because the login token lives in
  // localStorage and is only attached as an Authorization header by axios.
  const handleDownload = async () => {
    setActionError(''); setDownloadLoading(true);
    try {
      const res = await api.get(`/resources/${id}/download`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(res.data);
      const ext = resource.file_type === 'video' ? 'mp4' : resource.file_type || 'pdf';
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${resource.title.replace(/[^a-z0-9]+/gi, '_')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Download failed.');
    } finally {
      setDownloadLoading(false);
    }
  };

  if (error) return <div className="alert alert-warning">{error}</div>;
  if (!resource) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="row">
      <div className="col-12 col-md-4 mb-4">
        {resource.cover_image ? (
          <img
            src={`${assetBase}/uploads/covers/${resource.cover_image}`}
            alt={resource.title}
            className="rounded w-100"
            style={{ height: 320, objectFit: 'cover' }}
          />
        ) : (
          <div className="cover-placeholder rounded" style={{ height: 320 }}>
            <i className="bi bi-journal-richtext fs-1"></i>
          </div>
        )}
      </div>
      <div className="col-12 col-md-8">
        <h2 className="fw-bold">{resource.title}</h2>
        <p className="text-muted mb-1">by {resource.author || 'Unknown'}</p>
        {resource.category_name && <span className="badge bg-light text-dark border mb-3 me-2">{resource.category_name}</span>}
        {resource.is_ttlm && resource.ttlm_level_name && <span className="badge bg-success-subtle text-success border mb-3"><i className="bi bi-bar-chart-steps me-1"></i>TTLM · {resource.ttlm_level_name}</span>}
        <p>{resource.description}</p>
        {resource.keywords && <p className="small text-muted">Keywords: {resource.keywords}</p>}

        {actionError && <div className="alert alert-danger">{actionError}</div>}

        <div className="d-flex gap-2 mt-4 flex-wrap">
          <Link className="btn btn-brand" to={`/resource/${id}/reader`}>
            <i className="bi bi-book me-1"></i> Read Online
          </Link>
          {resource.downloadable && (
            <button className="btn btn-outline-primary" onClick={handleDownload} disabled={downloadLoading}>
              <i className="bi bi-download me-1"></i> {downloadLoading ? 'Downloading...' : 'Download'}
            </button>
          )}
          <button className="btn btn-outline-secondary" onClick={toggleBookmark}>
            <i className={`bi ${bookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'} me-1`}></i>
            {bookmarked ? 'Bookmarked' : 'Add to Favorites'}
          </button>
        </div>
      </div>
    </div>
  );
}
