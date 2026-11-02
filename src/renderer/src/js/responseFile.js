const prefix = 'powerhub-file-v1:';

export function fileResponse(body, headers = {}) {
    if (typeof body !== 'string') return null;
    if (body.startsWith(prefix)) {
        try {
            const file = JSON.parse(body.slice(prefix.length));
            if (typeof file.base64 === 'string') return file;
        } catch { return null; }
    }
    const getHeader = (name) => Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name)?.[1] || '';
    const contentType = String(getHeader('content-type'));
    const disposition = String(getHeader('content-disposition'));
    const mime = contentType.split(';')[0].trim().toLowerCase();
    const textual = !mime || mime.startsWith('text/') || /(?:json|xml|javascript|x-www-form-urlencoded|graphql|yaml|svg)/.test(mime);
    if (!/(?:^|;)\s*attachment\b/i.test(disposition) && textual && !body.includes('\u0000') && !body.includes('\ufffd')) return null;
    return { contentType, disposition, size: Number(getHeader('content-length')) || null, base64: null };
}
