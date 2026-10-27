import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface ParabolaChartProps {
  interactive?: boolean;
  showHeader?: boolean;
  showCaption?: boolean;
}

export const ParabolaChart: React.FC<ParabolaChartProps> = ({
  interactive = false,
  showHeader = false,
  showCaption = false
}) => {
  const [a, setA] = useState<number>(1);
  const b = -2;
  const c = -3;

  // Vertex coordinates
  const xv = -b / (2 * a);
  const yv = a * xv * xv + b * xv + c;

  // SVG dimensions (height ~270px)
  const width = 450;
  const height = 265;
  const paddingX = 35;
  const paddingY = 22;
  const plotW = width - 2 * paddingX;
  const plotH = height - 2 * paddingY;

  // Coordinate ranges: x in [-3.5, 3.5], y in [-6.5, 3.5]
  const minX = -3.5;
  const maxX = 3.5;
  const minY = -6.5;
  const maxY = 3.5;

  const toSvgX = (x: number) => paddingX + ((x - minX) / (maxX - minX)) * plotW;
  const toSvgY = (y: number) => paddingY + ((maxY - y) / (maxY - minY)) * plotH;

  // Origin
  const ox = toSvgX(0);
  const oy = toSvgY(0);

  // Generate curve points
  const points: [number, number][] = [];
  const step = 0.05;
  for (let x = -3.2; x <= 3.2; x += step) {
    const y = a * x * x + b * x + c;
    if (y >= minY - 0.4 && y <= maxY + 0.4) {
      points.push([toSvgX(x), toSvgY(y)]);
    }
  }

  const pathD = points.length > 0
    ? `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} ` +
      points.slice(1).map(p => `L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    : '';

  const xTicks = [-3, -2, -1, 1, 2, 3];
  const yTicks = [2, -2, -4, -6];

  const formatFormula = () => {
    let aStr = '';
    if (a === 1) aStr = '';
    else if (a === -1) aStr = '−';
    else if (a > 0) aStr = `${a}`;
    else aStr = `−${Math.abs(a)}`;
    return `y = ${aStr}x² − 2x − 3`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs space-y-2">
      {showHeader && (
        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-slate-500 font-medium pb-1 border-b border-slate-100">
          <span className="font-bold text-slate-700">Sơ đồ Parabol Oxy</span>
          {interactive && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-400">Hệ số a:</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
                {[-2, -1, 1, 2].map((val) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={a === val}
                  onClick={() => setA(val)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      a === val
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>
              {a !== 1 && (
                <button
                  type="button"
                  onClick={() => setA(1)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                  aria-label="Khôi phục hệ số mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="w-full flex justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[450px] h-[265px] select-none font-sans"
          role="img"
          aria-labelledby="parabola-title parabola-desc"
        >
          <title id="parabola-title">Đồ thị hàm số bậc hai {formatFormula()}</title>
          <desc id="parabola-desc">Đồ thị có đỉnh I({xv}, {yv}) và {a > 0 ? 'mở lên' : 'mở xuống'}</desc>

          {/* Grid lines */}
          {xTicks.map(x => (
            <line
              key={`grid-x-${x}`}
              x1={toSvgX(x)}
              y1={paddingY}
              x2={toSvgX(x)}
              y2={height - paddingY}
              stroke="#e2e8f0"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          ))}
          {yTicks.map(y => (
            <line
              key={`grid-y-${y}`}
              x1={paddingX}
              y1={toSvgY(y)}
              x2={width - paddingX}
              y2={toSvgY(y)}
              stroke="#e2e8f0"
              strokeWidth="0.8"
              strokeDasharray="3 3"
            />
          ))}

          {/* X Axis */}
          <line
            x1={paddingX - 8}
            y1={oy}
            x2={width - paddingX + 8}
            y2={oy}
            stroke="#64748b"
            strokeWidth="1.3"
          />
          <polygon
            points={`${width - paddingX + 13},${oy} ${width - paddingX + 6},${oy - 3} ${width - paddingX + 6},${oy + 3}`}
            fill="#64748b"
          />
          <text
            x={width - paddingX + 10}
            y={oy + 14}
            fontSize="12"
            fontWeight="bold"
            fill="#334155"
            textAnchor="end"
          >
            x
          </text>

          {/* Y Axis */}
          <line
            x1={ox}
            y1={height - paddingY + 8}
            x2={ox}
            y2={paddingY - 8}
            stroke="#64748b"
            strokeWidth="1.3"
          />
          <polygon
            points={`${ox},${paddingY - 13} ${ox - 3},${paddingY - 6} ${ox + 3},${paddingY - 6}`}
            fill="#64748b"
          />
          <text
            x={ox + 10}
            y={paddingY - 2}
            fontSize="12"
            fontWeight="bold"
            fill="#334155"
          >
            y
          </text>

          {/* Ticks and values */}
          {xTicks.map(x => (
            <g key={`tick-x-${x}`}>
              <line
                x1={toSvgX(x)}
                y1={oy - 2.5}
                x2={toSvgX(x)}
                y2={oy + 2.5}
                stroke="#64748b"
                strokeWidth="1"
              />
              <text
                x={toSvgX(x)}
                y={oy + 14}
                fontSize="10"
                fill="#64748b"
                textAnchor="middle"
              >
                {x}
              </text>
            </g>
          ))}
          <text
            x={ox - 6}
            y={oy + 13}
            fontSize="10"
            fill="#64748b"
            textAnchor="end"
          >
            0
          </text>

          {yTicks.map(y => (
            <g key={`tick-y-${y}`}>
              <line
                x1={ox - 2.5}
                y1={toSvgY(y)}
                x2={ox + 2.5}
                y2={toSvgY(y)}
                stroke="#64748b"
                strokeWidth="1"
              />
              <text
                x={ox - 6}
                y={toSvgY(y) + 3.5}
                fontSize="10"
                fill="#64748b"
                textAnchor="end"
              >
                {y}
              </text>
            </g>
          ))}

          {/* Parabola Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Formula Label */}
          <text
            x={toSvgX(Math.min(2.4, maxX - 0.7))}
            y={toSvgY(Math.min(2.0, maxY - 0.5))}
            fontSize="12"
            fontWeight="bold"
            fill="#1d4ed8"
            fontStyle="italic"
          >
            {formatFormula()}
          </text>

          {/* Vertex point */}
          {yv >= minY && yv <= maxY && (
            <g>
              <line
                x1={toSvgX(xv)}
                y1={oy}
                x2={toSvgX(xv)}
                y2={toSvgY(yv)}
                stroke="#3b82f6"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
              <line
                x1={ox}
                y1={toSvgY(yv)}
                x2={toSvgX(xv)}
                y2={toSvgY(yv)}
                stroke="#3b82f6"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
              <circle
                cx={toSvgX(xv)}
                cy={toSvgY(yv)}
                r="4"
                fill="#1e40af"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={toSvgX(xv)}
                y={a > 0 ? toSvgY(yv) + 15 : toSvgY(yv) - 9}
                fontSize="11"
                fontWeight="bold"
                fill="#1e3a8a"
                textAnchor="middle"
              >
                I({xv % 1 === 0 ? xv : xv.toFixed(1)}, {yv % 1 === 0 ? yv : yv.toFixed(1)})
              </text>
            </g>
          )}
        </svg>
      </div>

      {interactive && <p className="text-[10px] text-slate-400">Thử thay a để quan sát. Bài luyện tập sử dụng a = 1.</p>}
      {showCaption && (
        <div className="flex flex-wrap gap-2 items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Đỉnh parabol: <strong className="text-blue-700">I({xv}, {yv})</strong></span>
          <span>Bề lõm: <strong className="text-slate-700">{a > 0 ? 'Mở lên trên (a > 0)' : 'Úp xuống dưới (a < 0)'}</strong></span>
        </div>
      )}
    </div>
  );
};
