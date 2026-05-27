import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Loader2, CornerUpLeft, Pencil } from 'lucide-react';
import { uploadFile } from '../../api/conversations';
import type { Attachment, Message } from '../../types';

interface Props {
  onSend: (content: string, attachment?: Attachment) => void;
  onTyping: (typing: boolean) => void;
  replyingTo?: Message | null;
  editingMessage?: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg';
const MAX_MB = 50;

export default function MessageInput({
  onSend,
  onTyping,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const onTypingRef = useRef(onTyping);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { onTypingRef.current = onTyping; });

  // Сбрасываем typing при размонтировании (смена чата / выход)
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) { isTypingRef.current = false; onTypingRef.current(false); }
    };
  }, []);

  // Populate textarea when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(editingMessage.content);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  // Focus textarea on reply
  useEffect(() => {
    if (replyingTo) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyingTo?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!isTypingRef.current) { isTypingRef.current = true; onTyping(true); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { isTypingRef.current = false; onTyping(false); }, 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > MAX_MB * 1024 * 1024) {
      setUploadError(`Файл слишком большой (макс. ${MAX_MB} МБ)`);
      return;
    }
    setUploadError('');
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setUploadError('');
  };

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content && !file) return;

    setUploading(true);
    try {
      let attachment: Attachment | undefined;
      if (file) {
        attachment = await uploadFile(file);
        removeFile();
      }
      onSend(content, attachment);
      setText('');
    } catch {
      setUploadError('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;
    onTyping(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, file, onSend, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') {
      if (editingMessage) { handleCancelEdit(); }
      else if (replyingTo) { onCancelReply(); }
    }
  };

  const handleCancelEdit = () => {
    onCancelEdit();
    setText('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) { isTypingRef.current = false; onTyping(false); }
  };

  const canSend = (text.trim().length > 0 || !!file) && !uploading;
  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="bg-tg-sidebar-bg border-t border-tg-border safe-bottom">
      {/* Reply bar */}
      {replyingTo && !editingMessage && (
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
          <CornerUpLeft className="w-4 h-4 text-tg-primary shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-tg-primary pl-2.5">
            <div className="text-xs font-semibold text-tg-primary truncate leading-tight">{replyingTo.senderName}</div>
            <div className="text-xs text-tg-text-secondary truncate mt-0.5">{replyingTo.content || '[медиафайл]'}</div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Edit bar */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
          <Pencil className="w-4 h-4 text-tg-primary shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-tg-primary pl-2.5">
            <div className="text-xs font-semibold text-tg-primary leading-tight">Редактирование</div>
            <div className="text-xs text-tg-text-secondary truncate mt-0.5">{editingMessage.content}</div>
          </div>
          <button
            onClick={handleCancelEdit}
            className="p-1.5 text-tg-text-secondary hover:text-tg-text hover:bg-tg-hover rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File preview */}
      {preview && (
        <div className="px-4 pt-3 flex items-start gap-3">
          <div className="relative shrink-0">
            {isVideo ? (
              <video
                src={preview}
                className="w-20 h-20 object-cover rounded-xl bg-black"
                preload="metadata"
              />
            ) : (
              <img
                src={preview}
                alt="preview"
                className="w-20 h-20 object-cover rounded-xl"
              />
            )}
            <button
              onClick={removeFile}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-tg-text-secondary hover:bg-white text-white hover:text-tg-bg rounded-full flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="text-sm text-tg-text truncate">{file?.name}</div>
            <div className="text-xs text-tg-text-secondary mt-0.5">
              {file ? (file.size / 1024 / 1024).toFixed(1) + ' МБ' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 pt-2 text-xs text-rose-400">{uploadError}</div>
      )}

      {/* Input row */}
      <div className="px-4 py-2.5 flex items-center gap-2 select-none">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="hidden"
        />
        {!editingMessage && (
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Прикрепить файл"
            className="p-1.5 text-tg-text-secondary hover:text-tg-primary hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editingMessage ? 'Редактировать сообщение...' : 'Напишите сообщение...'}
          rows={1}
          className="flex-1 bg-tg-input-bg rounded-2xl px-3.5 py-2 text-tg-text placeholder:text-tg-text-secondary text-[15px] resize-none outline-none max-h-28 overflow-y-auto transition-all duration-200 leading-[1.4] border border-tg-border focus:border-tg-primary"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          title={editingMessage ? 'Сохранить (Enter)' : 'Отправить (Enter)'}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
            canSend
              ? 'bg-tg-primary text-white hover:opacity-90 cursor-pointer'
              : 'bg-tg-input-bg text-tg-text-secondary cursor-not-allowed opacity-50'
          }`}
        >
          {uploading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : editingMessage
              ? <Pencil className="w-4 h-4" />
              : <Send className="w-4.5 h-4.5" />
          }
        </button>
      </div>
    </div>
  );
}
