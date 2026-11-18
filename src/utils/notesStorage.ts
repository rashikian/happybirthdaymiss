export interface NoteRecord {
  id: string;
  title: string;
  contentHtml: string;
  plainText: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  archived: boolean;
}

const STORAGE_KEY = 'iqra_birthday_sanctuary_notes_v1';

const ALLOWED_TAGS = new Set([
  'P',
  'DIV',
  'BR',
  'H2',
  'H3',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'SPAN',
  'INPUT',
]);

export function sanitizeNoteHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml.replace(/<[^>]*>/g, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return '';

    const cleanNode = (node: Node): Node | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        return doc.createTextNode(node.textContent ?? '');
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (!ALLOWED_TAGS.has(tag)) {
        const frag = doc.createDocumentFragment();
        Array.from(el.childNodes).forEach((child) => {
          const cleaned = cleanNode(child);
          if (cleaned) frag.appendChild(cleaned);
        });
        return frag;
      }

      const cleanEl = doc.createElement(tag.toLowerCase());

      if (tag === 'INPUT') {
        const inputType = el.getAttribute('type');
        if (inputType !== 'checkbox') {
          return null;
        }
        cleanEl.setAttribute('type', 'checkbox');
        cleanEl.setAttribute('class', 'note-checkbox');
        cleanEl.setAttribute('contenteditable', 'false');
        if (el.hasAttribute('checked')) {
          cleanEl.setAttribute('checked', 'checked');
        }
        return cleanEl;
      }

      if (tag === 'DIV' && el.classList.contains('note-checklist-item')) {
        cleanEl.setAttribute('class', 'note-checklist-item');
        const checkedAttr = el.getAttribute('data-checked') === 'true' ? 'true' : 'false';
        cleanEl.setAttribute('data-checked', checkedAttr);
      } else if (tag === 'SPAN' && el.classList.contains('note-check-text')) {
        cleanEl.setAttribute('class', 'note-check-text');
      }

      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) cleanEl.appendChild(cleaned);
      });

      return cleanEl;
    };

    const output = doc.createElement('div');
    Array.from(root.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) output.appendChild(cleaned);
    });

    return output.innerHTML;
  } catch {
    return '';
  }
}

export function extractPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const blocks = doc.body.querySelectorAll('p, div, h2, h3, li, br');
    blocks.forEach((b) => {
      if (b.tagName === 'BR') {
        b.replaceWith(' ');
      } else {
        b.append(' ');
      }
    });
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

export function loadNotesFromStorage(): NoteRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validNotes: NoteRecord[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Partial<NoteRecord>;
      if (typeof rec.id !== 'string' || !rec.id.trim()) continue;

      const contentHtml = sanitizeNoteHtml(
        typeof rec.contentHtml === 'string' ? rec.contentHtml : '',
      );
      const plainText =
        typeof rec.plainText === 'string' && rec.plainText.length > 0
          ? rec.plainText
          : extractPlainText(contentHtml);
      const createdAt =
        typeof rec.createdAt === 'number' && Number.isFinite(rec.createdAt)
          ? rec.createdAt
          : Date.now();
      const updatedAt =
        typeof rec.updatedAt === 'number' && Number.isFinite(rec.updatedAt)
          ? rec.updatedAt
          : createdAt;

      validNotes.push({
        id: rec.id,
        title: typeof rec.title === 'string' ? rec.title : '',
        contentHtml,
        plainText,
        createdAt,
        updatedAt,
        pinned: Boolean(rec.pinned),
        archived: Boolean(rec.archived),
      });
    }

    return validNotes;
  } catch {
    return [];
  }
}

export function saveNotesToStorage(notes: NoteRecord[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch {
    return false;
  }
}

export function sortNotesByPinAndRecent(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.updatedAt - a.updatedAt;
  });
}

export function formatNoteTimestamp(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isSameDay) {
      return `Today · ${new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)}`;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  } catch {
    return 'Recently';
  }
}
