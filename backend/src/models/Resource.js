const pool = require('../config/db');

const Resource = {
  async create(data) {
    const {
      title, author, subject, keywords, description, category_id,
      file_path, file_size, file_type, cover_image, visibility, downloadable, uploaded_by, autoApprove, approved_by,
      allowed_roles, is_ttlm, ttlm_level_id,
    } = data;
    const status = autoApprove ? 'approved' : 'pending';
    const result = await pool.query(
      `INSERT INTO resources
        (title, author, subject, keywords, description, category_id, file_path, file_size, file_type,
         cover_image, visibility, downloadable, uploaded_by, status, approved_by, allowed_roles, is_ttlm, ttlm_level_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [title, author, subject, keywords, description, category_id, file_path, file_size || 0, file_type,
        cover_image, visibility, downloadable, uploaded_by, status, autoApprove ? approved_by : null,
        allowed_roles && allowed_roles.length ? allowed_roles : null,
        !!is_ttlm, is_ttlm && ttlm_level_id ? ttlm_level_id : null]
    );
    return result.rows[0];
  },

  // Any logged-in role sees all approved resources they're allowed to see -
  // if allowed_roles is set on a resource, it's hidden entirely from anyone
  // whose role isn't in that list (NULL = visible to every logged-in role).
  // Includes the uploader's department so Browse can group results by department.
  // Q8: optional ttlm_level_id lets Browse filter within a category by
  // TTLM level (e.g. Computer Science -> Level 1).
  async findApproved({ category_id, q, viewerRole, ttlm_level_id }) {
    const params = [];
    let where = `r.status = 'approved' AND (r.allowed_roles IS NULL OR $${params.length + 1} = ANY(r.allowed_roles))`;
    params.push(viewerRole);
    if (category_id) {
      params.push(category_id);
      where += ` AND r.category_id = $${params.length}`;
    }
    if (ttlm_level_id) {
      params.push(ttlm_level_id);
      where += ` AND r.is_ttlm = TRUE AND r.ttlm_level_id = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (r.title ILIKE $${params.length} OR r.author ILIKE $${params.length} OR r.subject ILIKE $${params.length} OR r.keywords ILIKE $${params.length})`;
    }
    const result = await pool.query(
      `SELECT r.*, c.name AS category_name, u.department AS uploader_department, tl.name AS ttlm_level_name
       FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN ttlm_levels tl ON r.ttlm_level_id = tl.id
       WHERE ${where} ORDER BY r.created_at DESC`,
      params
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT r.*, c.name AS category_name, u.full_name AS uploader_name, u.role AS uploader_role, tl.name AS ttlm_level_name
       FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN ttlm_levels tl ON r.ttlm_level_id = tl.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByUploader(uploaded_by) {
    const result = await pool.query(
      `SELECT r.*, c.name AS category_name FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE uploaded_by = $1 ORDER BY r.created_at DESC`,
      [uploaded_by]
    );
    return result.rows;
  },

  // Q2 fix: Department Head monitoring, scoped by DEPARTMENT NAME instead
  // of `created_by`. When a Department Head account is deleted and a new
  // one registered for the same department, the teachers' `created_by`
  // still points at the deleted (now-gone) head - matching on department
  // name instead means the NEW head immediately sees and can manage every
  // teacher already in their department, exactly like the old head could.
  async findByUploaderDepartment(department) {
    const result = await pool.query(
      `SELECT r.*, c.name AS category_name, u.full_name AS uploader_name FROM resources r
       LEFT JOIN categories c ON r.category_id = c.id
       JOIN users u ON r.uploaded_by = u.id
       WHERE u.department = $1 AND u.role = 'teacher' ORDER BY r.created_at DESC`,
      [department]
    );
    return result.rows;
  },

  // Admin Librarian's queue: the FINAL approval stage for every resource.
  //   - Teacher uploads only show up here AFTER their Faculty department
  //     head has already given stage-1 approval (status='faculty_approved').
  //   - Every other uploader's resources (Faculty's own uploads, Librarian,
  //     Staff, Admin Librarian, Admin) go straight from 'pending' to here -
  //     there is no stage-1 reviewer for them.
  async findPending() {
    const result = await pool.query(
      `SELECT r.*, u.full_name AS uploader_name, u.role AS uploader_role, c.name AS category_name
       FROM resources r
       LEFT JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE (r.status = 'faculty_approved')
          OR (r.status = 'pending' AND (u.role IS NULL OR u.role != 'teacher'))
       ORDER BY r.created_at ASC`
    );
    return result.rows;
  },

  // Q2 fix: department-scoped (not created_by-scoped) so this transfers
  // automatically to a newly registered Department Head - see note above
  // findByUploaderDepartment().
  async findPendingForFaculty(department) {
    const result = await pool.query(
      `SELECT r.*, u.full_name AS uploader_name, u.role AS uploader_role, c.name AS category_name
       FROM resources r
       JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.status = 'pending' AND u.role = 'teacher' AND u.department = $1
       ORDER BY r.created_at ASC`,
      [department]
    );
    return result.rows;
  },

  async countPendingForFaculty(department) {
    const result = await pool.query(
      `SELECT COUNT(*) FROM resources r
       JOIN users u ON r.uploaded_by = u.id
       WHERE r.status = 'pending' AND u.role = 'teacher' AND u.department = $1`,
      [department]
    );
    return parseInt(result.rows[0].count, 10);
  },

  // Admin oversight: literally everything, any status
  async findAllForAdmin() {
    const result = await pool.query(
      `SELECT r.*, u.full_name AS uploader_name, u.role AS uploader_role, c.name AS category_name
       FROM resources r
       LEFT JOIN users u ON r.uploaded_by = u.id
       LEFT JOIN categories c ON r.category_id = c.id
       ORDER BY r.created_at DESC`
    );
    return result.rows;
  },

  async updateMetadata(id, fields) {
    const allowed = ['title', 'author', 'subject', 'keywords', 'description', 'category_id', 'visibility', 'downloadable', 'file_type', 'allowed_roles'];
    const sets = [];
    const params = [];
    let i = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        // An empty array means "no restriction" (NULL), not "no one can
        // access it" - Postgres' `x = ANY(empty_array)` is always false,
        // which would accidentally lock everyone out.
        const value = (key === 'allowed_roles' && Array.isArray(fields[key]) && fields[key].length === 0)
          ? null
          : fields[key];
        sets.push(`${key} = $${i}`);
        params.push(value);
        i++;
      }
    }
    if (sets.length === 0) return this.findById(id);
    params.push(id);
    const result = await pool.query(
      `UPDATE resources SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
      params
    );
    return result.rows[0];
  },

  // Stage-1 approval by a Faculty department head, for a resource uploaded
  // by one of THEIR teachers. Does NOT publish the resource - it just moves
  // it into the Admin Librarian's final-approval queue.
  async facultyApprove(id, faculty_id) {
    const result = await pool.query(
      `UPDATE resources SET status = 'faculty_approved', faculty_approved_by = $1, faculty_approved_at = NOW(),
       rejection_reason = NULL, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [faculty_id, id]
    );
    return result.rows[0];
  },

  // ONLY an Admin Librarian calls this - the FINAL approval that actually
  // publishes the resource (works whether it arrived here directly as
  // 'pending', or via 'faculty_approved').
  async approve(id, approved_by) {
    const result = await pool.query(
      `UPDATE resources SET status = 'approved', approved_by = $1, rejection_reason = NULL, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [approved_by, id]
    );
    return result.rows[0];
  },

  // Called by either a Faculty head (stage 1, on their own teachers' work)
  // or an Admin Librarian (stage 1 or final) to reject a resource outright.
  async reject(id, approved_by, reason) {
    const result = await pool.query(
      `UPDATE resources SET status = 'rejected', approved_by = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [approved_by, reason, id]
    );
    return result.rows[0];
  },

  async remove(id) {
    await pool.query('DELETE FROM resources WHERE id = $1', [id]);
  },

  async incrementView(id) {
    await pool.query('UPDATE resources SET view_count = view_count + 1 WHERE id = $1', [id]);
  },

  async incrementDownload(id) {
    await pool.query('UPDATE resources SET download_count = download_count + 1 WHERE id = $1', [id]);
  },

  // Global stats - Admin & Librarian
  async globalStats() {
    const totals = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM resources WHERE status = 'approved') AS total_resources,
        (SELECT COALESCE(SUM(download_count),0) FROM resources) AS total_downloads,
        (SELECT COALESCE(SUM(view_count),0) FROM resources) AS total_views,
        (SELECT COUNT(*) FROM users WHERE role='student') AS total_students,
        (SELECT COUNT(*) FROM users WHERE role='teacher') AS total_teachers,
        (SELECT COUNT(*) FROM users WHERE role='department_head') AS total_department_head,
        (SELECT COUNT(*) FROM users WHERE role='librarian') AS total_librarians,
        (SELECT COUNT(*) FROM users WHERE role='staff') AS total_staff,
        (SELECT COUNT(*) FROM resources WHERE status IN ('pending','faculty_approved')) AS pending_count
    `);
    const mostViewed = await pool.query(
      `SELECT id, title, view_count FROM resources WHERE status='approved' ORDER BY view_count DESC LIMIT 5`
    );
    const mostDownloaded = await pool.query(
      `SELECT id, title, download_count FROM resources WHERE status='approved' ORDER BY download_count DESC LIMIT 5`
    );
    return { ...totals.rows[0], mostViewed: mostViewed.rows, mostDownloaded: mostDownloaded.rows };
  },

  // Q2 fix: department-scoped (not created_by-scoped) - see note above
  // findByUploaderDepartment().
  async facultyStats(department) {
    const result = await pool.query(`
      SELECT COUNT(*) AS total_resources,
             COALESCE(SUM(r.view_count),0) AS total_views,
             COALESCE(SUM(r.download_count),0) AS total_downloads
      FROM resources r JOIN users u ON r.uploaded_by = u.id
      WHERE u.department = $1 AND u.role = 'teacher'
    `, [department]);
    const pending_count = await this.countPendingForFaculty(department);
    return { ...result.rows[0], pending_count };
  },
};

module.exports = Resource;
