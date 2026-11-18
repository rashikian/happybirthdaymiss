import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Archive,
  ArchiveRestore,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatNoteTimestamp,
  loadNotesFromStorage,
  NoteRecord,
  saveNotesToStorage,
  sortNotesByPinAndRecent,
} from '../../utils/notesStorage';
import {NoteEditor} from './NoteEditor';

interface NotesAppOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  reducedMotion: boolean;
}

export const NotesAppOverlay: React.FC<NotesAppOverlayProps> = ({
  isOpen,
  onClose,
  reducedMotion,
}) => {
  const [notes, setNotes] = useState<NoteRecord[]>(() => loadNotesFromStorage());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'active' | 'archived'>('active');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Persist notes automatically to localStorage whenever notes change
  useEffect(() => {
    saveNotesToStorage(notes);
  }, [notes]);

  // Escape key returns cleanly to the birthday website (or goes back to list from editor)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmDeleteId, onClose]);

  const handleCreateNote = () => {
    const now = Date.now();
    const id = `note-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const newNote: NoteRecord = {
      id,
      title: '',
      contentHtml: '',
      plainText: '',
      createdAt: now,
      updatedAt: now,
      pinned: false,
      archived: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    setViewFilter('active');
    setActiveNoteId(id);
    setConfirmDeleteId(null);
  };

  const handleUpdateNote = useCallback(
    (
      id: string,
      patch: {title?: string; contentHtml?: string; plainText?: string},
    ) => {
      setNotes((prev) =>
        prev.map((note) => {
          if (note.id !== id) return note;
          const nextTitle = patch.title !== undefined ? patch.title : note.title;
          const nextHtml =
            patch.contentHtml !== undefined ? patch.contentHtml : note.contentHtml;
          const nextPlain =
            patch.plainText !== undefined ? patch.plainText : note.plainText;

          if (
            nextTitle === note.title &&
            nextHtml === note.contentHtml &&
            nextPlain === note.plainText
          ) {
            return note;
          }

          return {
            ...note,
            title: nextTitle,
            contentHtml: nextHtml,
            plainText: nextPlain,
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const handleTogglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? {...note, pinned: !note.pinned} : note,
      ),
    );
  }, []);

  const handleToggleArchive = useCallback(
    (id: string) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? {
                ...note,
                archived: !note.archived,
                pinned: note.archived ? note.pinned : false,
              }
            : note,
        ),
      );
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
      setConfirmDeleteId(null);
    },
    [activeNoteId],
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
      setConfirmDeleteId(null);
    },
    [activeNoteId],
  );

  const activeCount = useMemo(
    () => notes.filter((n) => !n.archived).length,
    [notes],
  );
  const archivedCount = useMemo(
    () => notes.filter((n) => n.archived).length,
    [notes],
  );

  const visibleNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      const matchesArchive =
        viewFilter === 'archived' ? note.archived : !note.archived;
      if (!matchesArchive) return false;
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.plainText.toLowerCase().includes(q)
      );
    });
    return sortNotesByPinAndRecent(filtered);
  }, [notes, searchQuery, viewFilter]);

  const activeNote = useMemo(
    () => (activeNoteId ? notes.find((n) => n.id === activeNoteId) ?? null : null),
    [notes, activeNoteId],
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Notes"
      className={`fixed inset-0 z-50 overflow-y-auto sunlit-canvas text-[#1D252B] ${
        reducedMotion ? '' : 'transition-opacity duration-200'
      }`}
    >
      {/* Subtle film grain layer matching the birthday site */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 film-grain-layer"
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-5 sm:px-6 sm:py-8">
        {/* Top Overlay Bar: Close returns to exact position on birthday page */}
        <div className="flex items-center justify-end gap-4 pb-4">
          <button
            type="button"
            onClick={() => {
              setConfirmDeleteId(null);
              setActiveNoteId(null);
              onClose();
            }}
            aria-label="Close notes and return to birthday page"
            title="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1D252B]/18 bg-[#FDFCFA] text-[#97282E] shadow-sm transition-colors hover:bg-[#97282E] hover:text-[#FDFCFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Main Notebook Content */}
        <div className="flex-1">
          {activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              onBack={() => setActiveNoteId(null)}
              onChangeNote={handleUpdateNote}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
              onDeleteNote={handleDeleteNote}
            />
          ) : (
            <div className="space-y-6">
              {/* Search, Filter Tabs & New Note Action */}
              <div className="rounded-2xl border border-[#1D252B]/16 bg-[#FDFCFA] p-4 sm:p-5 shadow-[0_14px_38px_-24px_rgba(29,37,43,0.32)]">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#42535E]"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search notes..."
                      aria-label="Search notes by title or content"
                      className="w-full rounded-xl border border-[#1D252B]/16 bg-[#FDFCFA] py-2.5 pl-10 pr-3.5 text-sm text-[#1D252B] placeholder:text-[#42535E]/65 focus:border-[#97282E] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateNote}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#97282E] px-5 py-2.5 text-sm font-semibold text-[#FDFCFA] shadow-sm transition-colors hover:bg-[#7D2025] active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>New note</span>
                  </button>
                </div>

                <div
                  role="tablist"
                  aria-label="Note folders"
                  className="mt-4 flex items-center gap-2 border-t border-[#1D252B]/10 pt-3"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewFilter === 'active'}
                    onClick={() => {
                      setViewFilter('active');
                      setConfirmDeleteId(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#97282E] ${
                      viewFilter === 'active'
                        ? 'bg-[#5AD7FC]/45 text-[#1D252B]'
                        : 'text-[#42535E] hover:bg-[#5AD7FC]/20 hover:text-[#1D252B]'
                    }`}
                  >
                    Notes <span className="font-mono-tabular opacity-80">({activeCount})</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewFilter === 'archived'}
                    onClick={() => {
                      setViewFilter('archived');
                      setConfirmDeleteId(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#97282E] ${
                      viewFilter === 'archived'
                        ? 'bg-[#5AD7FC]/45 text-[#1D252B]'
                        : 'text-[#42535E] hover:bg-[#5AD7FC]/20 hover:text-[#1D252B]'
                    }`}
                  >
                    Archived <span className="font-mono-tabular opacity-80">({archivedCount})</span>
                  </button>
                </div>
              </div>

              {/* Notes Grid (or minimal search-no-match notice) */}
              {visibleNotes.length === 0 ? (
                searchQuery.trim() ? (
                  <div className="rounded-2xl border border-[#1D252B]/14 bg-[#FDFCFA] px-6 py-10 text-center shadow-[0_14px_38px_-24px_rgba(29,37,43,0.28)]">
                    <p className="font-display text-xl font-medium text-[#1D252B]">
                      No matching notes found
                    </p>
                  </div>
                ) : null
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {visibleNotes.map((note) => {
                    const displayTitle = note.title.trim() || 'Untitled Note';
                    const preview =
                      note.plainText.trim() || 'Empty page, tap to start writing.';
                    const isConfirmingDelete = confirmDeleteId === note.id;

                    return (
                      <article
                        key={note.id}
                        className={`group flex flex-col justify-between rounded-2xl border bg-[#FDFCFA] p-5 shadow-[0_12px_30px_-22px_rgba(29,37,43,0.34)] transition-all duration-150 ${
                          note.pinned
                            ? 'border-[#97282E]/35'
                            : 'border-[#1D252B]/14 hover:border-[#1D252B]/28'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setActiveNoteId(note.id);
                          }}
                          className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#97282E]"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs text-[#42535E]">
                            <span>{formatNoteTimestamp(note.updatedAt)}</span>
                            {note.pinned && (
                              <span className="inline-flex items-center gap-1 font-medium text-[#97282E]">
                                <Pin className="h-3 w-3 fill-current" aria-hidden="true" />
                                <span>Pinned</span>
                              </span>
                            )}
                          </div>

                          <h2 className="mt-2 font-display text-xl font-semibold text-[#1D252B] group-hover:text-[#97282E] transition-colors line-clamp-1">
                            {displayTitle}
                          </h2>

                          <p className="mt-2 text-sm leading-relaxed text-[#42535E] line-clamp-3">
                            {preview}
                          </p>
                        </button>

                        {/* Card Organisation Controls */}
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#1D252B]/10 pt-3">
                          {isConfirmingDelete ? (
                            <div className="flex w-full items-center justify-between gap-2">
                              <span className="text-xs font-medium text-[#97282E]">
                                Delete this note?
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="inline-flex min-h-[34px] items-center rounded-lg bg-[#97282E] px-3 py-1 text-xs font-semibold text-[#FDFCFA] hover:bg-[#7D2025]"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="inline-flex min-h-[34px] items-center rounded-lg px-2.5 py-1 text-xs font-medium text-[#42535E] hover:text-[#1D252B]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(null);
                                  setActiveNoteId(note.id);
                                }}
                                className="text-xs font-semibold text-[#1D252B] hover:text-[#97282E] transition-colors py-1"
                              >
                                Open note
                              </button>

                              <div className="flex items-center gap-1">
                                {!note.archived && (
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePin(note.id)}
                                    aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                                    title={note.pinned ? 'Unpin' : 'Pin'}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                                      note.pinned
                                        ? 'text-[#97282E] bg-[#97282E]/10'
                                        : 'text-[#42535E] hover:bg-[#5AD7FC]/20 hover:text-[#1D252B]'
                                    }`}
                                  >
                                    <Pin
                                      className={`h-3.5 w-3.5 ${note.pinned ? 'fill-current' : ''}`}
                                      aria-hidden="true"
                                    />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(note.id)}
                                  aria-label={note.archived ? 'Restore note' : 'Archive note'}
                                  title={note.archived ? 'Restore' : 'Archive'}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#42535E] transition-colors hover:bg-[#5AD7FC]/20 hover:text-[#1D252B]"
                                >
                                  {note.archived ? (
                                    <ArchiveRestore
                                      className="h-3.5 w-3.5 text-[#97282E]"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(note.id)}
                                  aria-label="Delete note"
                                  title="Delete"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#42535E] transition-colors hover:bg-[#97282E]/10 hover:text-[#97282E]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quiet Footer */}
        <footer className="mt-8 border-t border-[#1D252B]/16 pt-4 text-center text-xs font-medium text-[#1D252B]/75">
          Private &amp; Secured
        </footer>
      </div>
    </div>
  );
};
