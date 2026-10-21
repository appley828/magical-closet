import { useState } from 'react';
import { prepareFigureImage, isAlreadyCutout, downscaleImage, type FigureImage } from '../lib/imageUtils';
import { removeImageBackground } from '../lib/backgroundRemoval';

interface ChildPhotoModalProps {
  currentPhotoUrl: string | null;
  onSave: (figure: FigureImage) => Promise<void>;
  onRemove: () => Promise<void>;
  onClose: () => void;
}

type Step = 'idle' | 'processing' | 'preview' | 'saving';

/** 設定小孩全身照：選照片 → 自動去背、裁邊 → 預覽 → 儲存 */
export default function ChildPhotoModal({ currentPhotoUrl, onSave, onRemove, onClose }: ChildPhotoModalProps) {
  const [step, setStep] = useState<Step>('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<FigureImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setStep('processing');
    setProgress(0);
    try {
      // 已去背的透明 PNG（例如修飾過的人形圖）直接用，不再跑去背
      const cutout = (await isAlreadyCutout(file))
        ? file
        : await removeImageBackground(await downscaleImage(file), setProgress);
      setPreview(await prepareFigureImage(cutout));
      setStep('preview');
    } catch (err) {
      console.error('處理小孩照片失敗:', err);
      setError(err instanceof Error && err.message === '照片裡找不到人物' ? err.message : '照片處理失敗，請換一張再試');
      setStep('idle');
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setStep('saving');
    setError(null);
    try {
      await onSave(preview);
      onClose();
    } catch (err) {
      console.error('儲存小孩照片失敗:', err);
      setError('儲存失敗，請稍後再試（若一直失敗，可能是 Firestore 規則尚未開放 settings 集合）');
      setStep('preview');
    }
  };

  const handleRemove = async () => {
    try {
      await onRemove();
      onClose();
    } catch (err) {
      console.error('移除小孩照片失敗:', err);
      setError('移除失敗，請稍後再試');
    }
  };

  const shown = preview?.dataUrl ?? currentPhotoUrl;
  const busy = step === 'processing' || step === 'saving';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[2000] sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">小孩全身照</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="關閉"
            className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600">
          用小孩的照片取代人台，搭配時就能看到實際穿上的樣子。
        </p>
        <ul className="text-xs text-gray-500 space-y-1 bg-pink-50 rounded-lg p-3">
          <li>・正面全身、從頭頂到腳底都入鏡</li>
          <li>・站直、手臂稍微離開身體</li>
          <li>・穿貼身素色衣服、背景單純，去背效果最好</li>
          <li>・也可以直接選已去背的透明 PNG</li>
        </ul>

        {/* 預覽（棋盤格底看得出去背效果） */}
        <div
          className="h-72 rounded-lg flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: '#fff',
            backgroundImage:
              'linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
          }}
        >
          {step === 'processing' ? (
            <div className="text-center text-sm text-gray-500">
              <div className="mx-auto mb-3 animate-spin rounded-full h-10 w-10 border-4 border-pink-200 border-t-pink-500" />
              去背中… {progress}%
              <p className="mt-1 text-xs text-gray-400">第一次需要下載模型，會比較久</p>
            </div>
          ) : shown ? (
            <img src={shown} alt="小孩全身照預覽" className="h-full w-auto object-contain" />
          ) : (
            <p className="text-sm text-gray-400">尚未設定照片</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="space-y-2">
          <label
            className={`block w-full text-center px-4 py-3 rounded-lg border border-pink-300 text-pink-600 ${
              busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-pink-50'
            }`}
          >
            {shown ? '換一張照片' : '選擇照片'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) handleFile(file);
              }}
            />
          </label>

          {preview && (
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="w-full px-4 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              {step === 'saving' ? '儲存中…' : '使用這張照片'}
            </button>
          )}

          {!preview && currentPhotoUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="w-full px-4 py-2 text-sm text-gray-500 hover:text-red-500"
            >
              移除照片，改回人台
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
