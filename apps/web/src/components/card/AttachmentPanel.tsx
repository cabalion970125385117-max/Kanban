import { useRef } from 'react';
import { Paperclip, Camera, Image, FileText, Trash2, Download } from 'lucide-react';
import { useAttachments, useCreateAttachment, useDeleteAttachment } from '@/hooks/useAttachments';
import { useAuthStore } from '@/stores/auth.store';

interface AttachmentPanelProps {
  cardId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function AttachmentPanel({ cardId }: AttachmentPanelProps) {
  const { data: attachments = [] } = useAttachments(cardId);
  const create = useCreateAttachment(cardId);
  const remove = useDeleteAttachment(cardId);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      // 10 MB cap per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`"${file.name}" is too large (max 10 MB)`);
        return;
      }
      create.mutate(file);
    });
  };

  return (
    <div>
      {/* Header + buttons */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
          <Paperclip className="h-3.5 w-3.5" />
          <span>Attachments</span>
          {attachments.length > 0 && (
            <span className="text-[var(--color-accent)] font-semibold">{attachments.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Camera capture */}
          <button
            type="button"
            title="Take photo"
            onClick={() => cameraRef.current?.click()}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] rounded transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Photo picker */}
          <button
            type="button"
            title="Attach image"
            onClick={() => photoRef.current?.click()}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] rounded transition-colors"
          >
            <Image className="h-3.5 w-3.5" />
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Document picker */}
          <button
            type="button"
            title="Attach document"
            onClick={() => docRef.current?.click()}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] rounded transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>
          <input
            ref={docRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {/* Image previews grid */}
          {attachments.some((a) => isImage(a.mime_type)) && (
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {attachments
                .filter((a) => isImage(a.mime_type))
                .map((a) => (
                  <div key={a.id} className="group relative aspect-square rounded overflow-hidden bg-gray-100">
                    <img
                      src={a.data}
                      alt={a.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <a
                        href={a.data}
                        download={a.name}
                        className="p-1 bg-white/90 rounded text-gray-700 hover:text-[var(--color-accent)]"
                        title="Download"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                      {a.user_id === currentUserId && (
                        <button
                          onClick={() => remove.mutate(a.id)}
                          className="p-1 bg-white/90 rounded text-gray-700 hover:text-[var(--color-danger)]"
                          title="Remove"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100">
                      {a.name}
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Non-image files as list */}
          {attachments
            .filter((a) => !isImage(a.mime_type))
            .map((a) => (
              <div
                key={a.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 hover:bg-gray-100"
              >
                <FileText className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] truncate">{a.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{formatBytes(a.size)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={a.data}
                    download={a.name}
                    className="p-1 text-gray-400 hover:text-[var(--color-accent)]"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  {a.user_id === currentUserId && (
                    <button
                      onClick={() => remove.mutate(a.id)}
                      className="p-1 text-gray-400 hover:text-[var(--color-danger)]"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {attachments.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)] py-1">No attachments yet.</p>
      )}
    </div>
  );
}
