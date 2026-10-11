// Reply references. A reply carries a short quote of the message it answers.
// It travels inside the encrypted payload, so the server never sees it, and it
// is only as trustworthy as the sender, so it is reduced to bounded strings.

const SNIPPET_LENGTH = 120;

// The short preview of a message that a reply quotes.
export function replySnippet(message) {
    if (message.text) return message.text.slice(0, SNIPPET_LENGTH);
    if (message.file) return `${message.file.isImage ? 'Photo' : 'File'}: ${message.file.name}`;
    return '';
}

// Builds the reference embedded in an outgoing message.
export const toReplyRef = (message) => (message
    ? { id: message.id, username: message.username, snippet: replySnippet(message) }
    : undefined);

// Validates a reference read from a decrypted message.
export function sanitizeReply(replyTo) {
    if (!replyTo || typeof replyTo !== 'object') return null;
    const { id, username, snippet } = replyTo;
    if (typeof id !== 'string' || typeof username !== 'string') return null;
    return {
        id: id.slice(0, 64),
        username: username.slice(0, 20),
        snippet: typeof snippet === 'string' ? snippet.slice(0, SNIPPET_LENGTH) : '',
    };
}
