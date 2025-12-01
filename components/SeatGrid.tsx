import React, { useState, useEffect } from 'react';
import { Seat } from '../types';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface SeatGridProps {
  seats: Seat[];
  onToggleSeat: (seatId: string) => void;
}

const SeatGrid: React.FC<SeatGridProps> = ({ seats, onToggleSeat }) => {
  const [scale, setScale] = useState(1);
  const [lastSelectedSeat, setLastSelectedSeat] = useState<string | null>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.6));

  // Auto-hide tooltip logic
  useEffect(() => {
    if (lastSelectedSeat) {
      const timer = setTimeout(() => {
        setLastSelectedSeat(null);
      }, 1500); // Display for 1.5 seconds
      return () => clearTimeout(timer);
    }
  }, [lastSelectedSeat]);

  const handleSeatClick = (seatId: string) => {
    onToggleSeat(seatId);
    setLastSelectedSeat(seatId);
  };

  // Calculate dynamic dimensions based on scale
  const seatSize = 32 * scale; // Base 32px
  const gapSize = 8 * scale;   // Base 8px
  const fontSize = Math.max(10 * scale, 8); // Base 10px, min 8px

  return (
    <div className="relative w-full">
      {/* Zoom Controls */}
      <div className="absolute top-0 right-0 z-10 flex flex-col gap-px bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <button 
          onClick={handleZoomIn} 
          className="p-2 hover:bg-gray-50 text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={scale >= 2.0}
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <div className="h-px bg-gray-100 w-full"></div>
        <button 
          onClick={handleZoomOut} 
          className="p-2 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={scale <= 0.6}
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
      </div>

      <div className="w-full overflow-x-auto pb-12 pt-10" style={{ scrollBehavior: 'smooth' }}>
        <div className="min-w-max mx-auto px-4 flex flex-col items-center">
          {/* Screen Visual */}
          <div 
            className="h-8 bg-gradient-to-b from-gray-200 to-gray-100 rounded-b-[50%] mb-10 shadow-sm flex items-center justify-center text-xs text-gray-400 tracking-widest border-b border-gray-300"
            style={{ width: `${Math.max(300, 8 * (seatSize + gapSize) + 40)}px` }}
          >
            屏幕 / 舞台方向
          </div>

          {/* Seat Grid */}
          <div 
            className="grid" 
            style={{ 
              gridTemplateColumns: `repeat(8, max-content)`,
              gap: `${gapSize}px`,
              padding: '4px'
            }}
          >
            {seats.map((seat) => {
              let bgColor = 'bg-white border-gray-300 hover:border-orange-400 hover:shadow-sm'; // Available
              let cursor = 'cursor-pointer';
              let content = scale > 0.8 ? `${seat.row}-${seat.col}` : '';
              let textColor = 'text-gray-600';
              
              if (seat.status === 'occupied') {
                bgColor = 'bg-gray-100 border-gray-200 opacity-60'; // Occupied
                cursor = 'cursor-not-allowed';
                content = ''; // Hide text for occupied
              } else if (seat.status === 'selected') {
                bgColor = 'bg-orange-600 border-orange-600 shadow-md shadow-orange-200'; // Selected
                textColor = 'text-white';
                content = '✓';
              }

              const showTooltip = lastSelectedSeat === seat.id;

              return (
                <div 
                  key={seat.id} 
                  className="relative" 
                  style={{ width: `${seatSize}px`, height: `${seatSize}px` }}
                >
                  <button
                    disabled={seat.status === 'occupied'}
                    onClick={() => handleSeatClick(seat.id)}
                    className={`
                      absolute inset-0 w-full h-full
                      rounded-lg flex items-center justify-center border transition-all duration-200 font-medium
                      ${bgColor} ${cursor} ${textColor}
                    `}
                    style={{
                      fontSize: `${fontSize}px`
                    }}
                    title={`${seat.row}排${seat.col}座 - ￥${seat.price}`}
                  >
                    {content}
                  </button>

                  {/* Price Tooltip Overlay */}
                  {showTooltip && (
                    <div 
                      className="absolute -top-9 left-1/2 transform -translate-x-1/2 bg-gray-900/95 text-white px-2.5 py-1 rounded-md shadow-xl z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center"
                      style={{ fontSize: '11px', minWidth: 'max-content' }}
                    >
                      <span className="font-bold">￥{seat.price}</span>
                      {/* Triangle Arrow */}
                      <div className="w-2 h-2 bg-gray-900/95 rotate-45 absolute -bottom-1"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-10 text-xs text-gray-500 bg-white/80 backdrop-blur px-6 py-2 rounded-full border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-gray-300 bg-white rounded-md"></div>
              <span>可选</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded-md opacity-60"></div>
              <span>已售</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-600 rounded-md shadow-sm"></div>
              <span>已选</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatGrid;