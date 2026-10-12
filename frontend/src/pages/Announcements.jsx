import { useEffect, useState } from 'react';
import api from '../api/axios';
import { assetBase } from '../utils/assetUrl';

function YouTubeEmbed({ url }) {
  // Accepts youtube.com/watch?v=, youtu.be/, or an already-embeddable URL.
  let embedUrl = url;
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  const id = watchMatch?.[1] || shortMatch?.[1];
  if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
  return (
    <div className="ratio ratio-16x9 mt-3">
      <iframe src={embedUrl} title="Announcement video" allowFullScreen></iframe>
    </div>
  );
}

// Q3: announcements must be reachable from EVERY role's own dashboard
// (not just a one-line banner on the logged-out Home page), rendered as
// full paragraphs - never a table, since a long message would get clipped
// by a column width - and able to show an image and/or a video.
export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/announcements').then((res) => setAnnouncements(res.data.announcements)).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h3 className="fw-bold mb-4"><i className="bi bi-megaphone me-2"></i>Announcements</h3>

      {loading && <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>}

      {!loading && announcements.length === 0 && (
        <p className="text-muted">There are no announcements right now. Check back later.</p>
      )}

      <div className="d-flex flex-column gap-4">
        {announcements.map((a) => (
          <div className="card border-0 shadow-sm" key={a.id}>
            {a.image_filename && (
              <img
                src={`${assetBase}/uploads/media/${a.image_filename}`}
                alt={a.title}
                className="card-img-top"
                style={{ maxHeight: 420, objectFit: 'cover' }}
              />
            )}
            <div className="card-body">
              <h5 className="fw-bold">{a.title}</h5>
              <p className="text-muted small mb-2">
                {a.posted_by_name ? `Posted by ${a.posted_by_name} — ` : ''}
                {new Date(a.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {/* Rendered as a paragraph, never truncated or crammed into a
                  table column - the whole point of this page. */}
              <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{a.message}</p>

              {a.video_filename && (
                <video controls className="w-100 mt-3" style={{ maxHeight: 480 }}>
                  <source src={`${assetBase}/uploads/media/${a.video_filename}`} />
                  Your browser doesn't support embedded video.
                </video>
              )}
              {!a.video_filename && a.video_url && <YouTubeEmbed url={a.video_url} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
