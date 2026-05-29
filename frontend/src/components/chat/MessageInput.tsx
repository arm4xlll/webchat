import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2, CornerUpLeft, Pencil, Mic, FileText, FileArchive, File as FileIcon, Smile } from 'lucide-react';
import { uploadFile } from '../../api/conversations';
import type { Attachment, Message } from '../../types';
import type { StickerItem } from '../../types/sticker';
import StickerPicker from './StickerPicker';

interface Props {
  conversationId: string;
  onSend: (content: string, attachment?: Attachment) => void;
  onSendSticker?: (sticker: StickerItem) => void;
  onTyping: (typing: boolean) => void;
  replyingTo?: Message | null;
  editingMessage?: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  externalFile?: File | null;
  onExternalFileConsumed?: () => void;
}

const MAX_MB = 50;

function formatRecordTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function getFileIcon(file: File) {
  const t = file.type.toLowerCase();
  const n = file.name.toLowerCase();
  if (t.includes('pdf') || n.endsWith('.pdf')) return <FileText className="w-7 h-7 text-rose-400 shrink-0" />;
  if (t.includes('zip') || t.includes('rar') || n.endsWith('.zip') || n.endsWith('.rar'))
    return <FileArchive className="w-7 h-7 text-yellow-400 shrink-0" />;
  if (t.includes('word') || t.includes('doc') || n.endsWith('.doc') || n.endsWith('.docx'))
    return <FileText className="w-7 h-7 text-blue-400 shrink-0" />;
  if (t.includes('sheet') || t.includes('excel') || n.endsWith('.xls') || n.endsWith('.xlsx'))
    return <FileText className="w-7 h-7 text-green-400 shrink-0" />;
  return <FileIcon className="w-7 h-7 text-tg-text-secondary shrink-0" />;
}

export default function MessageInput({
  conversationId,
  onSend, onTyping,
  replyingTo, editingMessage,
  onCancelReply, onCancelEdit,
  externalFile, onExternalFileConsumed,
  onSendSticker,
}: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const onTypingRef = useRef(onTyping);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { onTypingRef.current = onTyping; });

  useEffect(() => {
    const saved = localStorage.getItem(`draft:${conversationId}`) ?? '';
    setText(saved);
  }, [conversationId]);

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) { isTypingRef.current = false; onTypingRef.current(false); }
    stopRecordTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!externalFile) return;
    attachFile(externalFile);
    onExternalFileConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalFile]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isInInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (isInInput && active !== textareaRef.current) return;
      const clipFile = e.clipboardData?.files[0];
      if (clipFile) { e.preventDefault(); attachFile(clipFile); textareaRef.current?.focus(); }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    if (editingMessage) { setText(editingMessage.content); setTimeout(() => textareaRef.current?.focus(), 0); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  useEffect(() => {
    if (replyingTo) setTimeout(() => textareaRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyingTo?.id]);

  // ── File helpers ──────────────────────────────────────────────────────────

  const attachFile = (picked: File) => {
    if (picked.size > MAX_MB * 1024 * 1024) {
      setUploadError(`Файл слишком большой (макс. ${MAX_MB} МБ)`);
      return;
    }
    setUploadError('');
    setFile(picked);
    const isMedia = picked.type.startsWith('image/') || picked.type.startsWith('video/');
    setPreview(isMedia ? URL.createObjectURL(picked) : null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) attachFile(picked);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setUploadError('');
  };

  // ── Voice recording ───────────────────────────────────────────────────────

  const stopRecordTimer = () => {
    if (recordTimerRef.current) { clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setUploadError('Браузер не поддерживает запись (нужен HTTPS или localhost)');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunksRef.current = [];
      setRecordSeconds(0);
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mr.start(100);
      setRecording(true);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name;
      setUploadError(
        name === 'NotAllowedError' ? 'Доступ к микрофону запрещён — разрешите в настройках браузера'
          : name === 'NotFoundError' ? 'Микрофон не найден'
            : 'Не удалось получить доступ к микрофону'
      );
    }
  };

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr) { mr.ondataavailable = null; mr.onstop = null; mr.stream.getTracks().forEach(t => t.stop()); mr.stop(); mediaRecorderRef.current = null; }
    stopRecordTimer(); recordChunksRef.current = []; setRecording(false); setRecordSeconds(0);
  };

  const sendRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    const dur = recordSeconds;
    setUploading(true);
    await new Promise<void>(resolve => { mr.onstop = () => resolve(); mr.stop(); mr.stream.getTracks().forEach(t => t.stop()); });
    stopRecordTimer(); mediaRecorderRef.current = null; setRecording(false); setRecordSeconds(0);
    try {
      const rawMime = recordChunksRef.current[0]?.type || 'audio/webm';
      const mimeType = rawMime.split(';')[0].trim();
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(recordChunksRef.current, { type: mimeType });
      const audioFile = new File([blob], `voice-${dur}-${Date.now()}.${ext}`, { type: mimeType });
      recordChunksRef.current = [];
      const attachment = await uploadFile(audioFile);
      onSend('', attachment);
    } catch { setUploadError('Ошибка отправки голосового'); }
    finally { setUploading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordSeconds, onSend]);

  // ── Text send ─────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.trim()) { localStorage.setItem(`draft:${conversationId}`, val); }
    else { localStorage.removeItem(`draft:${conversationId}`); }
    if (!isTypingRef.current) { isTypingRef.current = true; onTyping(true); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { isTypingRef.current = false; onTyping(false); }, 2500);
  };

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content && !file) return;
    setUploading(true);
    try {
      let attachment: Attachment | undefined;
      if (file) { attachment = await uploadFile(file); removeFile(); }
      onSend(content, attachment);
      setText('');
      if (!editingMessage) { localStorage.removeItem(`draft:${conversationId}`); }
      else { const saved = localStorage.getItem(`draft:${conversationId}`) ?? ''; setText(saved); }
    } catch (e) {
      console.error('Upload failed', e);
      setUploadError('Ошибка загрузки файла');
    } finally { setUploading(false); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false; onTyping(false);
  }, [text, file, onSend, onTyping, conversationId, editingMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { if (editingMessage) handleCancelEdit(); else if (replyingTo) onCancelReply(); }
  };

  const handleCancelEdit = () => {
    onCancelEdit();
    const saved = localStorage.getItem(`draft:${conversationId}`) ?? '';
    setText(saved);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) { isTypingRef.current = false; onTyping(false); }
  };

  const canSend = (text.trim().length > 0 || !!file) && !uploading;
  const showMic = !editingMessage && !text.trim() && !file && !uploading;
  const isImageFile = file?.type.startsWith('image/');
  const isVideoFile = file?.type.startsWith('video/');
  const isMediaFile = isImageFile || isVideoFile;

  const handleStickerSend = useCallback((sticker: StickerItem) => {
    onSendSticker?.(sticker);
    setStickerPickerOpen(false);
  }, [onSendSticker]);

  return (
    <div className="relative bg-tg-sidebar-bg border-t border-tg-border safe-bottom">
      {stickerPickerOpen && !editingMessage && (
        <StickerPicker onSend={handleStickerSend} onClose={() => setStickerPickerOpen(false)} />
      )}

      {/* Reply bar */}
      {replyingTo && !editingMessage && (
        <div className="mx-3 mt-2.5 mb-1 flex items-center gap-3 bg-tg-hover rounded-xl px-3 py-2">
          <CornerUpLeft className="w-4 h-4 text-tg-primary shrink-0" />
          <div className="w-0.5 h-7 rounded-full bg-tg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-tg-primary leading-none mb-0.5">{replyingTo.senderName}</div>
            <div className="text-[12px] text-tg-text-secondary truncate">{replyingTo.content || '[медиафайл]'}</div>
          </div>
          <button onClick={onCancelReply} className="p-1.5 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit bar */}
      {editingMessage && (
        <div className="mx-3 mt-2.5 mb-1 flex items-center gap-3 bg-tg-hover rounded-xl px-3 py-2">
          <Pencil className="w-4 h-4 text-tg-primary shrink-0" />
          <div className="w-0.5 h-7 rounded-full bg-tg-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-tg-primary leading-none mb-0.5">Редактирование</div>
            <div className="text-[12px] text-tg-text-secondary truncate">{editingMessage.content}</div>
          </div>
          <button onClick={handleCancelEdit} className="p-1.5 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File preview */}
      {file && (
        <div className="mx-3 mt-2.5 mb-1 flex items-center gap-3 bg-tg-hover rounded-xl px-3 py-2.5">
          <div className="relative shrink-0">
            {isMediaFile && preview ? (
              isVideoFile
                ? <video src={preview} className="w-14 h-14 object-cover rounded-lg bg-black" preload="metadata" />
                : <img src={preview} alt="preview" className="w-14 h-14 object-cover rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-tg-input-bg flex items-center justify-center border border-tg-border">
                {getFileIcon(file)}
              </div>
            )}
            <button
              onClick={removeFile}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-medium text-tg-text truncate">{file.name}</div>
            <div className="text-[12px] text-tg-text-secondary mt-0.5">{formatSize(file.size)}</div>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mx-3 mt-2 text-xs text-rose-400 px-1">{uploadError}</div>
      )}

      {/* Recording row */}
      {recording ? (
        <div className="px-3 py-2.5 flex items-center gap-2.5 select-none">
          <button
            onClick={cancelRecording}
            className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Отменить запись"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center gap-3 bg-tg-input-bg rounded-2xl px-4 py-2.5 border border-rose-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[14px] font-semibold text-tg-text tabular-nums">{formatRecordTime(recordSeconds)}</span>
            <span className="text-[12.5px] text-tg-text-secondary">Запись...</span>
            <div className="flex items-end gap-[3px] ml-auto">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full bg-rose-400/80"
                  style={{
                    width: 3,
                    height: 3 + Math.abs((i - 7)) % 5 * 3,
                    animation: `voiceBar ${0.45 + (i % 4) * 0.15}s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={sendRecording}
            disabled={uploading}
            className="w-10 h-10 rounded-full bg-tg-primary flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md"
          >
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin text-white" />
              : <Send className="w-4 h-4 text-white ml-0.5" />}
          </button>
        </div>
      ) : (
        <div className="px-3 py-2.5 flex items-end gap-2.5 select-none">
          <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />

          {/* Unified input container */}
          <div className="flex-1 flex items-end bg-tg-input-bg rounded-[22px] border border-tg-border focus-within:border-tg-primary/60 transition-colors overflow-hidden min-w-0">
            {/* Left action buttons */}
            {!editingMessage && (
              <div className="flex items-center px-1.5 pb-[7px] gap-0.5 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Прикрепить файл (или Ctrl+V)"
                  className="p-1.5 text-tg-text-secondary hover:text-tg-primary rounded-full transition-colors cursor-pointer"
                >
                  <Paperclip className="w-[18px] h-[18px]" />
                </button>
                {onSendSticker && (
                  <button
                    onClick={() => setStickerPickerOpen(o => !o)}
                    title="Стикеры"
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                      stickerPickerOpen
                        ? 'text-tg-primary'
                        : 'text-tg-text-secondary hover:text-tg-primary'
                    }`}
                  >
                    <Smile className="w-[18px] h-[18px]" />
                  </button>
                )}
              </div>
            )}
            {editingMessage && <div className="w-3 shrink-0" />}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? 'Редактировать сообщение...' : 'Сообщение...'}
              rows={1}
              className="flex-1 bg-transparent py-[9px] pr-2 text-tg-text placeholder:text-tg-text-secondary text-[14.5px] resize-none outline-none max-h-32 overflow-y-auto leading-[1.45] min-w-0"
            />
          </div>

          {/* Send / Mic button */}
          {showMic ? (
            <button
              onClick={startRecording}
              title="Голосовое сообщение"
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-tg-input-bg border border-tg-border text-tg-text-secondary hover:text-tg-primary hover:border-tg-primary/50 transition-all cursor-pointer"
            >
              <Mic className="w-[18px] h-[18px]" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              title={editingMessage ? 'Сохранить (Enter)' : 'Отправить (Enter)'}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 shadow-sm ${
                canSend
                  ? 'bg-tg-primary text-white hover:opacity-90 cursor-pointer'
                  : 'bg-tg-input-bg border border-tg-border text-tg-text-secondary cursor-not-allowed opacity-40'
              }`}
            >
              {uploading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : editingMessage
                  ? <Pencil className="w-[15px] h-[15px]" />
                  : <Send className="w-[15px] h-[15px] ml-0.5" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
