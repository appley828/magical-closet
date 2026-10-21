import DressFormMannequin from './DressFormMannequin';
import { FIGURE_TOP, FIGURE_HEIGHT, type FigureMode } from '../lib/outfitLayout';

interface FigureBackgroundProps {
  mode: FigureMode;
  photoUrl?: string | null;
}

/** 舞台上的人形：人台或小孩全身照，畫在邏輯座標裡（由外層舞台負責縮放） */
export default function FigureBackground({ mode, photoUrl }: FigureBackgroundProps) {
  return (
    <div
      className="absolute inset-x-0 flex justify-center pointer-events-none"
      style={{ top: FIGURE_TOP, height: FIGURE_HEIGHT }}
    >
      {mode === 'child' && photoUrl ? (
        <img
          src={photoUrl}
          alt="小孩全身照"
          className="h-full w-full object-contain object-top"
          draggable={false}
        />
      ) : (
        <DressFormMannequin className="h-full w-auto opacity-70" />
      )}
    </div>
  );
}
