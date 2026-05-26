import { useState, useCallback, useRef } from 'react';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { uploadFile } from '../../api/conversations';
import type { Attachment } from '../../types';

interface Props {
  onSend: (content: string, attachment?: Attachment) => void;
  onTyping: (typing: boolean) => void;
}

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg';
const MAX_MB = 50;

export default function MessageInput({ onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [text, file, onSend, onTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const canSend = (text.trim().length > 0 || !!file) && !uploading;
  const isVideo = file?.type.startsWith('video/');

  return (
    <div className="bg-tg-sidebar-bg border-t border-tg-border safe-bottom">
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
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-tg-text-secondary hover:bg-white text-white hover:text-tg-bg rounded-full flex items-center justify-center transition-colors"
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
      <div className="px-4 py-3 flex items-center gap-2 select-none">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Прикрепить файл"
          className="p-2 text-tg-text-secondary hover:text-tg-primary hover:bg-tg-hover rounded-full transition-colors cursor-pointer shrink-0"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение..."
          rows={1}
          className="flex-1 bg-tg-input-bg rounded-2xl px-4 py-2.5 text-tg-text placeholder:text-tg-text-secondary text-[15px] resize-none outline-none max-h-28 overflow-y-auto transition-all duration-200 leading-[1.4] border border-tg-border focus:border-tg-primary"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          title="Отправить (Enter)"
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
            canSend
              ? 'bg-tg-primary text-white hover:opacity-90 cursor-pointer'
              : 'bg-tg-input-bg text-tg-text-secondary cursor-not-allowed opacity-50'
          }`}
        >
          {uploading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </button>
      </div>
    </div>
  );
}
