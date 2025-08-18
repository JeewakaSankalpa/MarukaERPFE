// src/api/helpers.js
export function qs(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        search.set(k, v);
    });
    return search.toString();
}

export function pageParams({ page = 0, size = 10, sort = 'name,asc' } = {}) {
    return { page, size, sort };
}
