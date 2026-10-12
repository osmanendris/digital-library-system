// Live-filters as you type; the icon button is also clickable (both trigger
// the same onChange, since filtering happens instantly via parent state).
export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="input-group mb-3" style={{ maxWidth: 360 }}>
      <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder || 'Search...'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button className="btn btn-outline-secondary" type="button" onClick={() => onChange('')}>
          <i className="bi bi-x-lg"></i>
        </button>
      )}
    </div>
  );
}
