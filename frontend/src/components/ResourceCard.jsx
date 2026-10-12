import { Link } from 'react-router-dom';
import formatBytes from '../utils/formatBytes';
import { assetBase } from '../utils/assetUrl';

const FILE_TYPE_LABELS = {
  pdf: 'PDF', epub: 'EPUB', ppt: 'PPT', pptx: 'PPTX',
  doc: 'DOC', docx: 'DOCX', video: 'VIDEO', mp4: 'MP4', mov: 'MOV',
};

export default function ResourceCard({ resource }) {
  const typeLabel = FILE_TYPE_LABELS[(resource.file_type || '').toLowerCase()] || (resource.file_type || '').toUpperCase();

  return (
    <div className="col-sm-6 col-md-4 col-lg-3 mb-3">
      <div className="card resource-card shadow-sm border-0">
        {resource.cover_image ? (
          <img src={`${assetBase}/uploads/covers/${resource.cover_image}`} className="card-img-top" style={{ height: 130, objectFit: 'cover' }} alt={resource.title} />
        ) : (
          <div className="cover-placeholder" style={{ height: 130 }}><i className="bi bi-journal-richtext"></i></div>
        )}
        <div className="card-body d-flex flex-column p-2">
          <h6 className="card-title mb-1 small fw-bold">{resource.title}</h6>
          <p className="text-muted mb-1" style={{ fontSize: '0.78rem' }}>{resource.author || 'Unknown author'}</p>
          {resource.subject && <p className="text-muted mb-1" style={{ fontSize: '0.75rem' }}><i className="bi bi-bookmark me-1"></i>{resource.subject}</p>}
          <div className="d-flex flex-wrap gap-1 mb-2">
            {typeLabel && <span className="badge bg-primary-subtle text-primary border" style={{ fontSize: '0.68rem' }}>{typeLabel}</span>}
            {resource.category_name && <span className="badge bg-light text-dark border" style={{ fontSize: '0.68rem' }}>{resource.category_name}</span>}
            {resource.is_ttlm && resource.ttlm_level_name && <span className="badge bg-success-subtle text-success border" style={{ fontSize: '0.68rem' }}><i className="bi bi-bar-chart-steps me-1"></i>TTLM · {resource.ttlm_level_name}</span>}
            {resource.file_size > 0 && <span className="badge bg-light text-muted border" style={{ fontSize: '0.68rem' }}>{formatBytes(resource.file_size)}</span>}
          </div>
          <Link to={`/resource/${resource.id}`} className="btn btn-sm btn-brand mt-auto">View Details</Link>
        </div>
      </div>
    </div>
  );
}
