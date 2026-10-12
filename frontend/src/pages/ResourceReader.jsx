import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';

// Loads mammoth's browser build defensively - different bundler/package
// versions expose it slightly differently, so we try the documented path
// first and fall back to the plain package entry if that fails.
async function loadMammoth() {
  try {
    return await import('mammoth/mammoth.browser.js');
  } catch {
    return await import('mammoth');
  }
}

// Renders every resource type directly in the browser wherever we can do so
// RELIABLY. Nothing is ever silently downloaded.
//   - PDF: native browser PDF viewer via an <iframe> pointed at a blob URL
//   - Video (mp4/mov/mkv): native <video> player
//   - Word documents (doc/docx): converted client-side to HTML with mammoth.js
//   - EPUB: rendered with epub.js in its DEFAULT paginated mode (the
//     library's most tested, most standard configuration) with Prev/Next
//     buttons - a previous "continuous scroll" customization caused a
//     fullscreen sizing bug, so we deliberately keep this simple now.
//   - PowerPoint (ppt/pptx): if the server has LibreOffice installed, this
//     is served as an exact-fidelity PDF instead (see servedAsPdf below).
//     WITHOUT LibreOffice, there is NO reliable in-browser PPTX renderer we
//     can offer - the pptx-preview library we tried repeatedly produced
//     black screens, duplicated slides, and broken fullscreen behavior, so
//     rather than keep shipping a broken experience, PPT/PPTX without
//     LibreOffice now shows a clear, honest "download to view" prompt.
export default function ResourceReader() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isReviewTab = searchParams.get('review') === '1';
  const [resource, setResource] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [servedAsPdf, setServedAsPdf] = useState(false);
  const [docHtml, setDocHtml] = useState(null);
  const [epubArrayBuffer, setEpubArrayBuffer] = useState(null);
  const [rawBlob, setRawBlob] = useState(null);
  const [error, setError] = useState('');
  const [renderError, setRenderError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [epubLoaded, setEpubLoaded] = useState(false);
  const viewerRef = useRef(null);
  const fullscreenRef = useRef(null);
  const renditionRef = useRef(null);

  const type = (resource?.file_type || '').toLowerCase();

  useEffect(() => {
    let cancelled = false;
    let createdUrl = null;
    lastLocationRef.current = null; // different resource - don't carry over the old book's page

    async function load() {
      try {
        // Fire both requests at once (instead of waiting for metadata to
        // come back before even starting the file download) so the actual
        // file - the slow part for docx/ppt/ebooks - starts streaming the
        // instant you click "Open" rather than after an extra round trip.
        const [metaRes, fileRes] = await Promise.all([
          api.get(`/resources/${id}`),
          api.get(`/resources/${id}/read`, { responseType: 'blob' }),
        ]);
        if (cancelled) return;
        const res = metaRes.data.resource;
        setResource(res);
        const t = (res.file_type || '').toLowerCase();

        setRawBlob(fileRes.data);

        // If the backend successfully converted this to a PDF via LibreOffice
        // (exact original pagination/fonts/layout preserved), prefer that
        // over any client-side approximate renderer, regardless of the
        // resource's declared file_type.
        const asPdf = fileRes.headers['x-preview-format'] === 'pdf';

        if (asPdf) {
          createdUrl = window.URL.createObjectURL(fileRes.data);
          if (!cancelled) { setBlobUrl(createdUrl); setServedAsPdf(true); }
        } else if (t === 'docx' || t === 'doc') {
          const buf = await fileRes.data.arrayBuffer();
          const mammoth = await loadMammoth();
          const result = await mammoth.convertToHtml({ arrayBuffer: buf });
          if (!cancelled) setDocHtml(result.value);
        } else if (t === 'epub') {
          const buf = await fileRes.data.arrayBuffer();
          if (!cancelled) setEpubArrayBuffer(buf);
        } else if (t === 'ppt' || t === 'pptx') {
          // No LibreOffice available (asPdf is false) - no reliable
          // in-browser renderer exists for this, so we're upfront about it
          // instead of attempting something that keeps breaking.
          if (!cancelled) {
            setRenderError(
              "This presentation can't be reliably previewed in the browser without LibreOffice installed on the server. Click below to download it and view with PowerPoint (or a similar app) instead."
            );
          }
          createdUrl = window.URL.createObjectURL(fileRes.data);
          if (!cancelled) setBlobUrl(createdUrl);
        } else {
          createdUrl = window.URL.createObjectURL(fileRes.data);
          if (!cancelled) setBlobUrl(createdUrl);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not open this resource.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
      if (createdUrl) window.URL.revokeObjectURL(createdUrl);
    };
  }, [id]);

  // EPUB: render in epub.js's DEFAULT paginated mode (no custom flow/manager
  // overrides) - this is the library's most standard, most tested code
  // path. Re-runs on fullscreen toggle since epub.js measures the
  // container's pixel size at creation time; destroying and recreating
  // avoids it getting stuck at a stale size.
  // Q5 fix: recreating the book/rendition used to always call
  // rendition.display() with no argument, which jumps back to page 1 -
  // so entering/exiting full screen while reading would lose your place.
  // We now track the current location (a CFI string) via the 'relocated'
  // event in lastLocationRef, and pass it to display() on re-render so
  // reading position survives the fullscreen toggle.
  const lastLocationRef = useRef(null);

  useEffect(() => {
    if (!epubArrayBuffer || !viewerRef.current || !resource || type !== 'epub') return;
    let cancelled = false;

    async function render() {
      try {
        viewerRef.current.innerHTML = '';
        setEpubLoaded(false);
        const EpubModule = await import('epubjs');
        const ePub = EpubModule.default || EpubModule;
        const book = ePub(epubArrayBuffer.slice(0));
        const rendition = book.renderTo(viewerRef.current, { width: '100%', height: '100%' });
        rendition.on('relocated', (loc) => {
          lastLocationRef.current = loc?.start?.cfi || null;
        });
        await rendition.display(lastLocationRef.current || undefined);
        if (cancelled) return;
        renditionRef.current = rendition;
        setEpubLoaded(true);
      } catch (err) {
        console.error('EPUB render failed:', err);
        if (!cancelled) {
          setRenderError("This EPUB couldn't be rendered in the browser (the file may use an unsupported feature).");
        }
      }
    }
    render();

    return () => {
      cancelled = true;
      if (renditionRef.current && typeof renditionRef.current.destroy === 'function') {
        renditionRef.current.destroy();
      }
    };
  }, [epubArrayBuffer, resource, type, isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullscreenRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const goPrevPage = () => renditionRef.current?.prev?.();
  const goNextPage = () => renditionRef.current?.next?.();

  useEffect(() => {
    if (type !== 'epub' || !epubLoaded) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goPrevPage();
      if (e.key === 'ArrowRight') goNextPage();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [type, epubLoaded]);

  const downloadRaw = () => {
    if (!rawBlob || !resource) return;
    const url = window.URL.createObjectURL(rawBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resource.title.replace(/[^a-z0-9]+/gi, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!resource) return null;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-0">{resource.title}</h3>
          <p className="text-muted mb-0 small">by {resource.author || 'Unknown'}</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary btn-sm" onClick={toggleFullscreen}>
            <i className={`bi ${isFullscreen ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'} me-1`}></i>
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          {!isReviewTab && (
            <Link to={`/resource/${id}`} className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-arrow-left me-1"></i> Back
            </Link>
          )}
        </div>
      </div>

      {isReviewTab && (
        <div className="alert alert-secondary py-2 small d-flex justify-content-between align-items-center">
          <span><i className="bi bi-eye me-1"></i> You're reviewing this in a separate tab.</span>
          <button className="btn btn-sm btn-outline-dark" onClick={() => window.close()}>
            <i className="bi bi-x-lg me-1"></i> Close Tab &amp; Return to Approval Queue
          </button>
        </div>
      )}

      {renderError && (
        <div className="alert alert-warning">
          <i className="bi bi-info-circle me-2"></i>{renderError}
          <div className="mt-2">
            <button className="btn btn-sm btn-brand" onClick={downloadRaw}>
              <i className="bi bi-download me-1"></i> Download to view
            </button>
          </div>
        </div>
      )}

      {servedAsPdf && !renderError && (
        <div className="alert alert-success py-2 small">
          <i className="bi bi-patch-check me-1"></i> Showing an exact rendering of the original document.
        </div>
      )}

      {/* This wrapper is what actually goes fullscreen, so controls above stay visible while reading */}
      <div ref={fullscreenRef} className="bg-white" style={{ width: '100%' }}>
        {(servedAsPdf || type === 'pdf') && blobUrl && (
          <iframe title={resource.title} src={blobUrl} style={{ width: '100%', height: isFullscreen ? '100vh' : '80vh', border: 'none' }} />
        )}

        {!servedAsPdf && ['video', 'mp4', 'mov', 'mkv'].includes(type) && blobUrl && (
          <video controls src={blobUrl} style={{ width: '100%', maxHeight: isFullscreen ? '100vh' : '80vh' }} />
        )}

        {!servedAsPdf && (type === 'docx' || type === 'doc') && docHtml && (
          <div
            className="bg-white p-4 rounded shadow-sm docx-viewer"
            style={{ maxHeight: isFullscreen ? '100vh' : '80vh', overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: docHtml }}
          />
        )}

        {!servedAsPdf && type === 'epub' && !renderError && (
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary" onClick={goPrevPage} disabled={!epubLoaded} aria-label="Previous page">
              <i className="bi bi-chevron-left"></i>
            </button>
            <div
              ref={viewerRef}
              className="rounded border mx-auto flex-grow-1"
              style={{ maxWidth: 760, height: isFullscreen ? '100vh' : 600 }}
            />
            <button className="btn btn-outline-secondary" onClick={goNextPage} disabled={!epubLoaded} aria-label="Next page">
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
