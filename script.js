/**
 * ToolVault — Bookmark Manager (MongoDB-backed)
 * Frontend JavaScript — communicates with Express REST API.
 * Dark mode preference stays in localStorage (client-side only).
 */

const API_BASE = '/api/bookmarks';

// ─── DOM References ──────────────────────────────────────────────
const bookmarksGrid  = document.getElementById('bookmarksGrid');
const emptyState     = document.getElementById('emptyState');
const searchInput    = document.getElementById('searchInput');
const modal          = document.getElementById('modal');
const modalContent   = document.getElementById('modalContent');
const modalTitle     = document.getElementById('modalTitle');
const openModalBtn   = document.getElementById('openModalBtn');
const closeModalBtn  = document.getElementById('closeModalBtn');
const bookmarkForm   = document.getElementById('bookmarkForm');
const editIdField    = document.getElementById('editId');
const submitBtnText  = document.getElementById('submitBtnText');
const darkModeToggle = document.getElementById('darkModeToggle');
const sunIcon        = document.getElementById('sunIcon');
const moonIcon       = document.getElementById('moonIcon');

// ─── State ───────────────────────────────────────────────────────
const THEME_KEY = 'toolvault_theme';
let cachedBookmarks = []; // Local cache to avoid API calls on every search keystroke

// ─── API Helpers ─────────────────────────────────────────────────

/**
 * Fetch all bookmarks from the server.
 * @returns {Promise<Array>} Array of bookmark objects
 */
async function fetchBookmarks() {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedBookmarks = data;
    return data;
  } catch (err) {
    console.error('Failed to fetch bookmarks:', err);
    showToast('Failed to load bookmarks');
    return cachedBookmarks; // Return cache on failure
  }
}

/**
 * Create a new bookmark on the server.
 * @param {Object} bookmark - { name, url, description, logo }
 * @returns {Promise<Object|null>}
 */
async function createBookmark(bookmark) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to create bookmark:', err);
    showToast('Failed to add tool');
    return null;
  }
}

/**
 * Update a bookmark on the server.
 * @param {string} id - MongoDB _id
 * @param {Object} data - Fields to update
 * @returns {Promise<Object|null>}
 */
async function updateBookmark(id, data) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to update bookmark:', err);
    showToast('Failed to update tool');
    return null;
  }
}

/**
 * Delete a bookmark on the server.
 * @param {string} id - MongoDB _id
 * @returns {Promise<boolean>}
 */
async function removeBookmark(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return true;
  } catch (err) {
    console.error('Failed to delete bookmark:', err);
    showToast('Failed to delete tool');
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Build a fallback logo URL from a website domain.
 * @param {string} url
 * @returns {string}
 */
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return '';
  }
}

/** Escape HTML to prevent XSS */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ─── Dark Mode ───────────────────────────────────────────────────

function initDarkMode() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    updateThemeIcons(true);
  } else {
    document.documentElement.classList.remove('dark');
    updateThemeIcons(false);
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  if (isDark) {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
}

// ─── Toast Notification ──────────────────────────────────────────

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  toastMessage.textContent = message;
  toast.classList.remove('translate-y-4', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0', 'pointer-events-none');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 2500);
}

// ─── Modal Controls ──────────────────────────────────────────────

function openModal(editMode = false) {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => {
    modalContent.classList.remove('scale-95', 'opacity-0');
    modalContent.classList.add('scale-100', 'opacity-100');
  });
  if (editMode) {
    modalTitle.textContent = 'Edit Tool';
    submitBtnText.textContent = 'Save Changes';
  } else {
    modalTitle.textContent = 'Add New Tool';
    submitBtnText.textContent = 'Add Tool';
  }
}

function closeModal() {
  modalContent.classList.remove('scale-100', 'opacity-100');
  modalContent.classList.add('scale-95', 'opacity-0');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    bookmarkForm.reset();
    editIdField.value = '';
  }, 200);
}

// ─── CRUD Operations (async, API-backed) ─────────────────────────

/**
 * Add a new bookmark or update an existing one.
 * Called on form submission.
 */
async function addBookmark(e) {
  e.preventDefault();

  const name = document.getElementById('toolName').value.trim();
  const url  = document.getElementById('toolUrl').value.trim();
  const desc = document.getElementById('toolDesc').value.trim();
  let logo   = document.getElementById('toolLogo').value.trim();

  if (!logo) {
    logo = getFaviconUrl(url);
  }

  const editId = editIdField.value;

  if (editId) {
    // ── Update existing ──
    const result = await updateBookmark(editId, { name, url, description: desc, logo });
    if (result) showToast('Tool updated successfully!');
  } else {
    // ── Create new ──
    const result = await createBookmark({ name, url, description: desc, logo });
    if (result) showToast('Tool added successfully!');
  }

  closeModal();
  await renderBookmarks();
}

/**
 * Delete a bookmark by its MongoDB _id.
 * @param {string} id
 */
async function deleteBookmark(id) {
  const success = await removeBookmark(id);
  if (success) {
    showToast('Tool deleted.');
    await renderBookmarks();
  }
}

/**
 * Populate the modal form for editing.
 * @param {string} id
 */
function editBookmark(id) {
  const bm = cachedBookmarks.find(b => b._id === id);
  if (!bm) return;

  editIdField.value = bm._id;
  document.getElementById('toolName').value = bm.name;
  document.getElementById('toolUrl').value  = bm.url;
  document.getElementById('toolDesc').value = bm.description || '';
  document.getElementById('toolLogo').value = bm.logo || '';

  openModal(true);
}

/**
 * Export a single bookmark (or all) as a JSON file download.
 * @param {string|null} id
 */
function exportData(id) {
  const data = id ? cachedBookmarks.filter(b => b._id === id) : cachedBookmarks;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = id ? `tool-${data[0]?.name || 'export'}.json` : 'toolvault-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported!');
}

// ─── Rendering ───────────────────────────────────────────────────

/**
 * Render bookmarks into the grid.
 * Fetches fresh data from the API (unless filtering cached data).
 * @param {string} filter - Search query (lowercased)
 * @param {boolean} useCache - If true, filter from cache instead of re-fetching
 */
async function renderBookmarks(filter = '', useCache = false) {
  const bookmarks = useCache ? cachedBookmarks : await fetchBookmarks();
  const filtered = filter
    ? bookmarks.filter(b => b.name.toLowerCase().includes(filter))
    : bookmarks;

  // Toggle empty state
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
    bookmarksGrid.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
    bookmarksGrid.classList.remove('hidden');
  }

  bookmarksGrid.innerHTML = '';

  filtered.forEach((bm, i) => {
    const id = bm._id; // MongoDB _id
    const card = document.createElement('div');
    card.className = [
      'card-animate relative group',
      'bg-white dark:bg-matte-800',
      'rounded-2xl',
      'border-2 border-slate-200/80 dark:border-matte-600/70',
      'shadow-md shadow-slate-200/60 dark:shadow-matte-950/40',
      'hover:shadow-[0_16px_48px_-8px_rgba(99,102,241,0.2)] dark:hover:shadow-[0_16px_48px_-8px_rgba(99,102,241,0.3)]',
      'hover:border-brand-300/60 dark:hover:border-brand-500/40',
      'hover:-translate-y-1.5',
      'transition-all duration-300 ease-out',
      'overflow-hidden',
    ].join(' ');
    card.style.animationDelay = `${i * 0.04}s`;

    const logoSrc = bm.logo || getFaviconUrl(bm.url);
    const fallbackSrc = getFaviconUrl(bm.url);

    card.innerHTML = `
      <!-- Accent gradient bar -->
      <div class="h-1 w-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <!-- Three-dot menu -->
      <div class="absolute top-3 right-2 sm:right-3 z-10">
        <button
          onclick="toggleDropdown('dd-${id}')"
          class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-matte-500 hover:bg-slate-100 dark:hover:bg-matte-700 hover:text-slate-600 dark:hover:text-matte-300 transition-colors"
          aria-label="Menu"
        >
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>
        </button>

        <!-- Dropdown -->
        <div id="dd-${id}" class="hidden dropdown-animate absolute right-0 mt-1 w-36 sm:w-40 bg-white dark:bg-matte-800 rounded-xl shadow-xl border-2 border-slate-200 dark:border-matte-600 py-1.5 z-20">
          <button onclick="editBookmark('${id}')" class="w-full flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-matte-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/></svg>
            Edit
          </button>
          <button onclick="exportData('${id}')" class="w-full flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 dark:text-matte-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
            Export
          </button>
          <div class="my-1 border-t border-slate-200 dark:border-matte-600"></div>
          <button onclick="deleteBookmark('${id}')" class="w-full flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors">
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
            Delete
          </button>
        </div>
      </div>

      <!-- Card body -->
      <div class="px-3 sm:px-5 pt-5 sm:pt-6 pb-4 sm:pb-5 flex flex-col items-center text-center">
        <!-- Logo -->
        <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-matte-700 dark:to-matte-800 border-2 border-slate-200 dark:border-matte-600 flex items-center justify-center mb-3 sm:mb-4 overflow-hidden">
          <img
            src="${logoSrc}"
            alt="${escapeHtml(bm.name)} logo"
            class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain"
            onerror="this.onerror=null; this.src='${fallbackSrc}';"
          />
        </div>

        <!-- Name -->
        <h3 class="font-semibold text-slate-800 dark:text-matte-100 text-xs sm:text-sm mb-0.5 sm:mb-1 leading-tight truncate w-full">${escapeHtml(bm.name)}</h3>

        <!-- Description -->
        <p class="text-[10px] sm:text-xs text-slate-500 dark:text-matte-400 leading-relaxed mb-3 sm:mb-4 line-clamp-2 min-h-[1.5rem] sm:min-h-[2rem]">${escapeHtml(bm.description || 'No description')}</p>

        <!-- Visit button -->
        <a
          href="${escapeHtml(bm.url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold text-[10px] sm:text-xs border border-brand-200 dark:border-brand-700/50 hover:bg-brand-100 dark:hover:bg-brand-900/40 hover:shadow-md hover:shadow-brand-200/30 dark:hover:shadow-brand-900/30 transition-all duration-200"
        >
          Visit
          <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
        </a>
      </div>
    `;

    bookmarksGrid.appendChild(card);
  });
}

// ─── Dropdown Toggle ─────────────────────────────────────────────

function toggleDropdown(id) {
  document.querySelectorAll('[id^="dd-"]').forEach(el => {
    if (el.id !== id) el.classList.add('hidden');
  });
  const dd = document.getElementById(id);
  dd.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[id^="dd-"]') && !e.target.closest('[onclick*="toggleDropdown"]')) {
    document.querySelectorAll('[id^="dd-"]').forEach(el => el.classList.add('hidden'));
  }
});

// ─── Event Listeners ─────────────────────────────────────────────

darkModeToggle.addEventListener('click', toggleDarkMode);
openModalBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
bookmarkForm.addEventListener('submit', addBookmark);

// Search with debounce — filters cached data to avoid API spam
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    renderBookmarks(e.target.value.toLowerCase().trim(), true);
  }, 200);
});

// ─── Initialize ──────────────────────────────────────────────────
initDarkMode();
renderBookmarks();
