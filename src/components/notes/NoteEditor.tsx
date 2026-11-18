import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bold,
  Check,
  CheckSquare,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Pin,
  Redo2,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react';
import {
  extractPlainText,
  formatNoteTimestamp,
  NoteRecord,
  sanitizeNoteHtml,
} from '../../utils/notesStorage';

interface NoteEditorProps {
  note: NoteRecord;
  onBack: () => void;
  onChangeNote: (
    id: string,
    patch: {title?: string; contentHtml?: string; plainText?: string},
  ) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDeleteNote: (id: string) => void;
}

interface Snapshot {
  title: string;
  html: string;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: boolean;
  unorderedList: boolean;
  orderedList: boolean;
  checklist: boolean;
}

const DEFAULT_FORMAT_STATE: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  heading: false,
  unorderedList: false,
  orderedList: false,
  checklist: false,
};

function createChecklistElement(initialText = ''): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'note-checklist-item';
  item.setAttribute('data-checked', 'false');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'note-checkbox';
  checkbox.setAttribute('contenteditable', 'false');

  const textSpan = document.createElement('span');
  textSpan.className = 'note-check-text';
  if (initialText) {
    textSpan.textContent = initialText;
  } else {
    textSpan.appendChild(document.createElement('br'));
  }

  item.appendChild(checkbox);
  item.appendChild(textSpan);
  return item;
}

function placeCaretInside(target: HTMLElement, atEnd = true) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  if (atEnd) {
    range.selectNodeContents(target);
    range.collapse(false);
  } else {
    range.setStart(target, 0);
    range.collapse(true);
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onBack,
  onChangeNote,
  onTogglePin,
  onToggleArchive,
  onDeleteNote,
}) => {
  const [title, setTitle] = useState(note.title);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formatState, setFormatState] = useState<FormatState>(DEFAULT_FORMAT_STATE);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef(note.title);
  const noteIdRef = useRef(note.id);
  const saveTimerRef = useRef<number | null>(null);
  const historyTimerRef = useRef<number | null>(null);
  const historyRef = useRef<Snapshot[]>([{title: note.title, html: note.contentHtml}]);
  const historyIndexRef = useRef(0);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushSnapshot = useCallback(
    (nextTitle: string, nextHtml: string) => {
      const current = historyRef.current[historyIndexRef.current];
      if (current && current.title === nextTitle && current.html === nextHtml) {
        return;
      }
      const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
      trimmed.push({title: nextTitle, html: nextHtml});
      if (trimmed.length > 80) {
        trimmed.shift();
      }
      historyRef.current = trimmed;
      historyIndexRef.current = trimmed.length - 1;
      syncHistoryFlags();
    },
    [syncHistoryFlags],
  );

  const hydratedRef = useRef(false);

  // Hydrate editor once on mount (NoteEditor is keyed by note.id)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    noteIdRef.current = note.id;
    titleRef.current = note.title;
    setTitle(note.title);
    setConfirmDelete(false);
    setSaveState('saved');

    if (editorRef.current) {
      editorRef.current.innerHTML = note.contentHtml || '';
    }

    historyRef.current = [{title: note.title, html: note.contentHtml || ''}];
    historyIndexRef.current = 0;
    syncHistoryFlags();
  }, [note.id, note.title, note.contentHtml, syncHistoryFlags]);

  const flushPendingSave = useCallback(
    (explicitTitle?: string, explicitHtml?: string) => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const htmlRaw = explicitHtml ?? editorRef.current?.innerHTML ?? '';
      const cleanHtml = sanitizeNoteHtml(htmlRaw);
      const plainText = extractPlainText(cleanHtml);
      const nextTitle = explicitTitle ?? titleRef.current;

      onChangeNote(noteIdRef.current, {
        title: nextTitle,
        contentHtml: cleanHtml,
        plainText,
      });
      setSaveState('saved');
    },
    [onChangeNote],
  );

  const scheduleSave = useCallback(
    (nextTitle?: string, nextHtml?: string) => {
      setSaveState('saving');
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        flushPendingSave(nextTitle, nextHtml);
      }, 240);
    },
    [flushPendingSave],
  );

  useEffect(() => {
    return () => {
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        flushPendingSave();
      }
    };
  }, [flushPendingSave]);

  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setFormatState(DEFAULT_FORMAT_STATE);
      return;
    }

    const anchorNode = selection.anchorNode;
    if (!anchorNode || !editorRef.current.contains(anchorNode)) {
      return;
    }

    const anchorEl =
      anchorNode.nodeType === Node.ELEMENT_NODE
        ? (anchorNode as HTMLElement)
        : anchorNode.parentElement;

    const inChecklist = Boolean(anchorEl?.closest('.note-checklist-item'));
    let blockValue = '';
    try {
      blockValue = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    } catch {
      blockValue = '';
    }

    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      heading: blockValue === 'h2' || blockValue === 'h3' || Boolean(anchorEl?.closest('h2,h3')),
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
      checklist: inChecklist,
    });
  }, []);

  useEffect(() => {
    const handleSelection = () => updateToolbarState();
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, [updateToolbarState]);

  const scheduleHistorySnapshot = useCallback(
    (nextTitle: string, nextHtml: string) => {
      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
      }
      historyTimerRef.current = window.setTimeout(() => {
        pushSnapshot(nextTitle, nextHtml);
      }, 360);
    },
    [pushSnapshot],
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    titleRef.current = next;
    setTitle(next);
    const html = editorRef.current?.innerHTML ?? '';
    scheduleHistorySnapshot(next, html);
    scheduleSave(next, html);
  };

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML ?? '';
    scheduleHistorySnapshot(titleRef.current, html);
    scheduleSave(titleRef.current, html);
    updateToolbarState();
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0) return;
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
    }
    historyIndexRef.current -= 1;
    const snap = historyRef.current[historyIndexRef.current];
    if (snap) {
      titleRef.current = snap.title;
      setTitle(snap.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = snap.html;
      }
      flushPendingSave(snap.title, snap.html);
    }
    syncHistoryFlags();
    updateToolbarState();
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    if (historyTimerRef.current !== null) {
      window.clearTimeout(historyTimerRef.current);
    }
    historyIndexRef.current += 1;
    const snap = historyRef.current[historyIndexRef.current];
    if (snap) {
      titleRef.current = snap.title;
      setTitle(snap.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = snap.html;
      }
      flushPendingSave(snap.title, snap.html);
    }
    syncHistoryFlags();
    updateToolbarState();
  };

  const runExecCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    pushSnapshot(titleRef.current, editorRef.current.innerHTML);
    editorRef.current.focus();
    document.execCommand(command, false, value);
    const nextHtml = editorRef.current.innerHTML;
    pushSnapshot(titleRef.current, nextHtml);
    scheduleSave(titleRef.current, nextHtml);
    updateToolbarState();
  };

  const handleToggleHeading = () => {
    if (!editorRef.current) return;
    pushSnapshot(titleRef.current, editorRef.current.innerHTML);
    editorRef.current.focus();
    const nextTag = formatState.heading ? '<p>' : '<h2>';
    document.execCommand('formatBlock', false, nextTag);
    const nextHtml = editorRef.current.innerHTML;
    pushSnapshot(titleRef.current, nextHtml);
    scheduleSave(titleRef.current, nextHtml);
    updateToolbarState();
  };

  const handleInsertChecklist = () => {
    const editor = editorRef.current;
    if (!editor) return;

    pushSnapshot(titleRef.current, editor.innerHTML);
    editor.focus();

    const selection = window.getSelection();
    const anchorEl =
      selection?.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection?.anchorNode?.parentElement ?? null;

    const existingCheck = anchorEl?.closest('.note-checklist-item');
    if (existingCheck) {
      // Toggle back to plain paragraph
      const text = existingCheck.querySelector('.note-check-text')?.textContent ?? '';
      const p = document.createElement('p');
      if (text.trim()) {
        p.textContent = text;
      } else {
        p.appendChild(document.createElement('br'));
      }
      existingCheck.replaceWith(p);
      placeCaretInside(p);
    } else {
      const block = anchorEl?.closest('p, div, h2, h3, li');
      if (block && editor.contains(block) && block !== editor && !block.closest('ul, ol')) {
        const lineText = block.textContent ?? '';
        const newItem = createChecklistElement(lineText);
        block.replaceWith(newItem);
        const span = newItem.querySelector('.note-check-text') as HTMLElement | null;
        if (span) placeCaretInside(span);
      } else {
        const newItem = createChecklistElement();
        editor.appendChild(newItem);
        const span = newItem.querySelector('.note-check-text') as HTMLElement | null;
        if (span) placeCaretInside(span);
      }
    }

    const nextHtml = editor.innerHTML;
    pushSnapshot(titleRef.current, nextHtml);
    scheduleSave(titleRef.current, nextHtml);
    updateToolbarState();
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleNativeChange = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
        return;
      }

      if (historyTimerRef.current !== null) {
        window.clearTimeout(historyTimerRef.current);
        historyTimerRef.current = null;
      }
      pushSnapshot(titleRef.current, editor.innerHTML);

      if (target.checked) {
        target.setAttribute('checked', 'checked');
      } else {
        target.removeAttribute('checked');
      }
      const row = target.closest('.note-checklist-item');
      if (row) {
        row.setAttribute('data-checked', String(target.checked));
      }

      const nextHtml = editor.innerHTML;
      pushSnapshot(titleRef.current, nextHtml);
      flushPendingSave(titleRef.current, nextHtml);
    };

    editor.addEventListener('change', handleNativeChange);
    return () => editor.removeEventListener('change', handleNativeChange);
  }, [pushSnapshot, flushPendingSave]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMeta = e.metaKey || e.ctrlKey;
    if (isMeta && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }
    if (isMeta && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const anchorEl =
      selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection.anchorNode?.parentElement ?? null;

    const checklistItem = anchorEl?.closest('.note-checklist-item');
    if (!checklistItem || !editorRef.current?.contains(checklistItem)) {
      return;
    }

    const textSpan = checklistItem.querySelector('.note-check-text') as HTMLElement | null;
    const currentText = textSpan?.textContent?.replace(/\u200B/g, '') ?? '';

    if (e.key === 'Enter') {
      e.preventDefault();
      pushSnapshot(titleRef.current, editorRef.current.innerHTML);

      if (!currentText.trim()) {
        // Exit checklist cleanly into a plain paragraph
        const p = document.createElement('p');
        p.appendChild(document.createElement('br'));
        checklistItem.replaceWith(p);
        placeCaretInside(p);
      } else {
        const nextItem = createChecklistElement();
        checklistItem.insertAdjacentElement('afterend', nextItem);
        const nextSpan = nextItem.querySelector('.note-check-text') as HTMLElement | null;
        if (nextSpan) placeCaretInside(nextSpan);
      }

      const nextHtml = editorRef.current.innerHTML;
      pushSnapshot(titleRef.current, nextHtml);
      scheduleSave(titleRef.current, nextHtml);
      updateToolbarState();
      return;
    }

    if (e.key === 'Backspace' && currentText.length === 0) {
      e.preventDefault();
      pushSnapshot(titleRef.current, editorRef.current.innerHTML);
      const p = document.createElement('p');
      p.appendChild(document.createElement('br'));
      checklistItem.replaceWith(p);
      placeCaretInside(p);

      const nextHtml = editorRef.current.innerHTML;
      pushSnapshot(titleRef.current, nextHtml);
      scheduleSave(titleRef.current, nextHtml);
      updateToolbarState();
    }
  };

  const handleBackClick = () => {
    flushPendingSave();
    onBack();
  };

  const toolbarBtnClass = (active: boolean, disabled = false) =>
    `inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#97282E] ${
      disabled
        ? 'opacity-35 cursor-not-allowed text-[#42535E]'
        : active
          ? 'bg-[#97282E]/12 text-[#97282E]'
          : 'text-[#1D252B]/80 hover:bg-[#5AD7FC]/25 hover:text-[#1D252B]'
    }`;

  return (
    <div className="rounded-2xl border border-[#1D252B]/16 bg-[#FDFCFA] shadow-[0_18px_46px_-24px_rgba(29,37,43,0.35)] overflow-hidden">
      {/* Editor Top Navigation & Organisation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1D252B]/12 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={handleBackClick}
          aria-label="Back to notes list"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#1D252B] transition-colors hover:bg-[#5AD7FC]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
        >
          <ArrowLeft className="h-4 w-4 text-[#97282E]" aria-hidden="true" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Subtle Autosave Status */}
          <span
            aria-live="polite"
            className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-[#42535E]"
          >
            {saveState === 'saved' ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#1B4332]" aria-hidden="true" />
                <span>Saved</span>
              </>
            ) : (
              <span>Saving...</span>
            )}
          </span>

          {/* Pin / Unpin */}
          <button
            type="button"
            onClick={() => onTogglePin(note.id)}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            title={note.pinned ? 'Unpin note' : 'Pin note'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E] ${
              note.pinned
                ? 'bg-[#97282E]/12 text-[#97282E]'
                : 'text-[#42535E] hover:bg-[#5AD7FC]/20 hover:text-[#1D252B]'
            }`}
          >
            <Pin className={`h-4 w-4 ${note.pinned ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>

          {/* Archive / Restore */}
          <button
            type="button"
            onClick={() => {
              flushPendingSave();
              onToggleArchive(note.id);
            }}
            aria-label={note.archived ? 'Restore note from archive' : 'Archive note'}
            title={note.archived ? 'Restore note' : 'Archive note'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#42535E] transition-colors hover:bg-[#5AD7FC]/20 hover:text-[#1D252B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
          >
            {note.archived ? (
              <ArchiveRestore className="h-4 w-4 text-[#97282E]" aria-hidden="true" />
            ) : (
              <Archive className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {/* Delete with Inline Confirmation */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 pl-1">
              <button
                type="button"
                onClick={() => onDeleteNote(note.id)}
                className="inline-flex min-h-[36px] items-center rounded-lg bg-[#97282E] px-3 py-1.5 text-xs font-semibold text-[#FDFCFA] hover:bg-[#7D2025]"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="inline-flex min-h-[36px] items-center rounded-lg px-2 py-1.5 text-xs font-medium text-[#42535E] hover:text-[#1D252B]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete note"
              title="Delete note"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#42535E] transition-colors hover:bg-[#97282E]/10 hover:text-[#97282E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Minimal, Intuitive Formatting Toolbar */}
      <div
        role="toolbar"
        aria-label="Note formatting controls"
        className="flex flex-wrap items-center gap-1 border-b border-[#1D252B]/10 bg-[#E7F8FE]/45 px-4 py-2 sm:px-6"
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runExecCommand('bold')}
          aria-label="Bold"
          aria-pressed={formatState.bold}
          title="Bold"
          className={toolbarBtnClass(formatState.bold)}
        >
          <Bold className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runExecCommand('italic')}
          aria-label="Italic"
          aria-pressed={formatState.italic}
          title="Italic"
          className={toolbarBtnClass(formatState.italic)}
        >
          <Italic className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runExecCommand('underline')}
          aria-label="Underline"
          aria-pressed={formatState.underline}
          title="Underline"
          className={toolbarBtnClass(formatState.underline)}
        >
          <Underline className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="mx-1 h-4 w-px bg-[#1D252B]/15" aria-hidden="true" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleToggleHeading}
          aria-label="Heading"
          aria-pressed={formatState.heading}
          title="Heading"
          className={toolbarBtnClass(formatState.heading)}
        >
          <Heading2 className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runExecCommand('insertUnorderedList')}
          aria-label="Bullet list"
          aria-pressed={formatState.unorderedList}
          title="Bullet list"
          className={toolbarBtnClass(formatState.unorderedList)}
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runExecCommand('insertOrderedList')}
          aria-label="Numbered list"
          aria-pressed={formatState.orderedList}
          title="Numbered list"
          className={toolbarBtnClass(formatState.orderedList)}
        >
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleInsertChecklist}
          aria-label="Checklist"
          aria-pressed={formatState.checklist}
          title="Checklist"
          className={toolbarBtnClass(formatState.checklist)}
        >
          <CheckSquare className="h-4 w-4" aria-hidden="true" />
        </button>

        <span className="mx-1 h-4 w-px bg-[#1D252B]/15" aria-hidden="true" />

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          className={toolbarBtnClass(false, !canUndo)}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          className={toolbarBtnClass(false, !canRedo)}
        >
          <Redo2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Distraction-Free Writing Sheet */}
      <div className="mx-auto max-w-2xl px-5 py-7 sm:px-10 sm:py-10">
        <p className="text-xs font-medium text-[#42535E]">
          Last edited {formatNoteTimestamp(note.updatedAt)}
          {note.archived && (
            <>
              {' '}
              <span aria-hidden="true">·</span>{' '}
              <span className="text-[#97282E]">Archived</span>
            </>
          )}
        </p>

        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled note..."
          aria-label="Note title"
          className="mt-2.5 w-full bg-transparent font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D252B] placeholder:text-[#42535E]/45 focus:outline-none"
        />

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Note content"
          data-placeholder="Write something down, a thought, a quote, or a small list..."
          onInput={handleEditorInput}
          onKeyDown={handleEditorKeyDown}
          onMouseUp={updateToolbarState}
          onKeyUp={updateToolbarState}
          className="note-editor-prose mt-5 min-h-[300px] sm:min-h-[360px] text-base leading-[1.8] text-[#1D252B] focus:outline-none"
        />
      </div>
    </div>
  );
};
