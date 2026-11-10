// Shared presentation for record lists. These helpers never read or write data.
function collectionEmptyState(title, description, icon = 'folder') {
    const paths = {
        folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/><path d="M8 12h8m-8 4h5"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
        file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h5"/>',
        inbox: '<path d="M4 4h16l2 10v6H2v-6Zm-2 10h6l2 3h4l2-3h6"/>'
    };
    return `<div class="agency-empty col-span-full" role="status"><span class="agency-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[icon] || paths.folder}</svg></span><h3>${escapeAdminText(title)}</h3><p>${escapeAdminText(description)}</p></div>`;
}

function updateCollectionSelection(kind, count) {
    const row = document.querySelector(`[data-agency-bulk="${kind}"]`);
    if (row) row.dataset.selectionCount = String(count);
}

function updateCollectionFilter(kind, selected) {
    document.querySelectorAll(`[data-agency-filters="${kind}"] button`).forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
    });
}
