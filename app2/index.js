const { useState, useEffect, useRef, useCallback, useMemo } = React;
const h = React.createElement;

// ===== UTILITY FUNCTIONS =====
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const generateId = () => 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

// ===== DEMO DATA GENERATOR =====
const generateDemoData = (childAge) => {
  const ageMonths = (childAge?.years || 4) * 12 + (childAge?.months || 0);
  
  const initials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'ng', 'h', 'gw', 'kw', 'w', 'j', 's', 'ts', 'z'];
  const finals = ['aa', 'aai', 'aau', 'aam', 'aan', 'aang', 'aap', 'aat', 'aak', 'ai', 'au', 'am', 'an', 'ang', 'ap', 'at', 'ak', 'e', 'ei', 'eng', 'ek', 'i', 'iu', 'im', 'in', 'ing', 'ip', 'it', 'ik', 'o', 'oi', 'on', 'ong', 'ot', 'ok', 'ou', 'u', 'ui', 'un', 'ung', 'ut', 'uk'];
  const tones = [1, 2, 3, 4, 5, 6];

  const sampleSentences = [
    { chars: '我', jyutping: 'ngo5', initial: 'ng', final: 'o', tone: 5, confidence: 92 },
    { chars: '想', jyutping: 'soeng2', initial: 's', final: 'oeng', tone: 2, confidence: 85 },
    { chars: '食', jyutping: 'sik6', initial: 's', final: 'ik', tone: 6, confidence: 78 },
    { chars: '蘋', jyutping: 'ping4', initial: 'p', final: 'ing', tone: 4, confidence: 45 },
    { chars: '果', jyutping: 'gwo2', initial: 'gw', final: 'o', tone: 2, confidence: 88 },
    { chars: '同', jyutping: 'tung4', initial: 't', final: 'ung', tone: 4, confidence: 91 },
    { chars: '埋', jyutping: 'maai4', initial: 'm', final: 'aai', tone: 4, confidence: 72 },
    { chars: '飲', jyutping: 'jam2', initial: 'j', final: 'am', tone: 2, confidence: 82 },
    { chars: '水', jyutping: 'seoi2', initial: 's', final: 'eoi', tone: 2, confidence: 63 },
    { chars: '呀', jyutping: 'aa3', initial: '', final: 'aa', tone: 3, confidence: 95 },
    { chars: '媽', jyutping: 'maa1', initial: 'm', final: 'aa', tone: 1, confidence: 96 },
    { chars: '媽', jyutping: 'maa1', initial: 'm', final: 'aa', tone: 1, confidence: 94 },
    { chars: '我', jyutping: 'ngo5', initial: 'ng', final: 'o', tone: 5, confidence: 90 },
    { chars: '要', jyutping: 'jiu3', initial: 'j', final: 'iu', tone: 3, confidence: 76 },
    { chars: '去', jyutping: 'heoi3', initial: 'h', final: 'eoi', tone: 3, confidence: 80 },
    { chars: '公', jyutping: 'gung1', initial: 'g', final: 'ung', tone: 1, confidence: 87 },
    { chars: '園', jyutping: 'jyun4', initial: 'j', final: 'yun', tone: 4, confidence: 55 },
    { chars: '玩', jyutping: 'waan2', initial: 'w', final: 'aan', tone: 2, confidence: 89 },
  ];

  // Generate syllable times
  let time = 0.3;
  const transcription = sampleSentences.map((s, i) => {
    const dur = 0.25 + Math.random() * 0.35;
    const gap = 0.05 + Math.random() * 0.15;
    const entry = { ...s, startTime: time, endTime: time + dur, id: i };
    time += dur + gap;
    return entry;
  });

  // Syllable inventory
  const detectedInitials = {};
  const detectedFinals = {};
  const detectedTones = {};
  
  transcription.forEach(t => {
    if (t.initial) {
      detectedInitials[t.initial] = (detectedInitials[t.initial] || 0) + 1;
    }
    if (t.final) {
      detectedFinals[t.final] = (detectedFinals[t.final] || 0) + 1;
    }
    detectedTones[t.tone] = (detectedTones[t.tone] || 0) + 1;
  });

  // Norm comparison scores (affected by age)
  const ageFactor = Math.min(1, ageMonths / 72); // normalized to 6 years
  const baseAccuracy = 60 + ageFactor * 30;
  
  const scores = {
    initialAccuracy: Math.min(100, Math.round(baseAccuracy + (Math.random() - 0.3) * 20)),
    finalAccuracy: Math.min(100, Math.round(baseAccuracy - 5 + (Math.random() - 0.3) * 20)),
    toneAccuracy: Math.min(100, Math.round(baseAccuracy + 5 + (Math.random() - 0.3) * 15)),
    syllableStructure: Math.min(100, Math.round(baseAccuracy - 2 + (Math.random() - 0.3) * 18)),
    intelligibility: Math.min(100, Math.round(baseAccuracy + 3 + (Math.random() - 0.3) * 15)),
  };

  const overallDeviation = Math.round(100 - (scores.initialAccuracy + scores.finalAccuracy + scores.toneAccuracy + scores.syllableStructure + scores.intelligibility) / 5);
  const percentile = Math.max(5, Math.min(95, Math.round(50 + (50 - overallDeviation) * 1.2 + (Math.random() - 0.5) * 10)));

  // Phoneme frequency chart data
  const phonemeFrequency = Object.entries(detectedInitials).map(([k, v]) => ({ label: k, count: v, type: 'initial' }))
    .concat(Object.entries(detectedFinals).slice(0, 8).map(([k, v]) => ({ label: k, count: v, type: 'final' })));

  // Radar chart data
  const radarData = {
    labels: ['塞音', '擦音', '塞擦音', '鼻音', '邊音', '半元音'],
    child: [0.7 + Math.random()*0.3, 0.5 + Math.random()*0.4, 0.4 + Math.random()*0.5, 0.8 + Math.random()*0.2, 0.6 + Math.random()*0.3, 0.7 + Math.random()*0.3].map(v => Math.min(1, v * ageFactor + 0.2)),
    norm: [0.95, 0.85, 0.80, 0.95, 0.90, 0.92],
  };

  // Tone contour data
  const toneContours = tones.map(t => ({
    tone: t,
    expected: getToneContour(t),
    child: getToneContour(t).map(v => v + (Math.random() - 0.5) * 30),
  }));

  // Age norm comparison line data
  const ageNormData = [];
  for (let a = 24; a <= 84; a += 6) {
    const normScore = Math.min(100, 40 + (a / 84) * 55);
    ageNormData.push({
      ageMonths: a,
      label: `${Math.floor(a/12)}歲${a%12 ? a%12 + '個月' : ''}`,
      normScore: Math.round(normScore),
      childScore: a === ageMonths ? Math.round((scores.initialAccuracy + scores.finalAccuracy + scores.toneAccuracy) / 3) : null,
    });
  }
  // Ensure child's age is in the data
  if (!ageNormData.find(d => d.childScore !== null)) {
    const closest = ageNormData.reduce((prev, curr) => Math.abs(curr.ageMonths - ageMonths) < Math.abs(prev.ageMonths - ageMonths) ? curr : prev);
    closest.childScore = Math.round((scores.initialAccuracy + scores.finalAccuracy + scores.toneAccuracy) / 3);
  }

  // Phonological processes
  const processes = [
    { name: '塞音化 (Stopping)', detected: Math.random() > 0.4, examples: 's→t: 「食」→「滴」' },
    { name: '前置化 (Fronting)', detected: Math.random() > 0.5, examples: 'g→d: 「公」→「東」' },
    { name: '省略尾音 (Final Deletion)', detected: Math.random() > 0.6, examples: '-ng→∅: 「凍」→「多」' },
    { name: '送氣化 (Aspiration)', detected: Math.random() > 0.7, examples: 'b→p: 「波」→「坡」' },
    { name: '聲調替代 (Tone Substitution)', detected: Math.random() > 0.5, examples: 'T1→T4' },
  ];

  return {
    transcription,
    detectedInitials,
    detectedFinals,
    detectedTones,
    scores,
    overallDeviation,
    percentile,
    phonemeFrequency,
    radarData,
    toneContours,
    ageNormData,
    processes: processes.filter(p => p.detected),
    totalDuration: time + 0.5,
  };
};

function getToneContour(tone) {
  const contours = {
    1: [140, 142, 145, 148, 150, 152, 155], // high level
    2: [100, 108, 118, 128, 138, 148, 155], // high rising
    3: [110, 112, 113, 112, 111, 110, 110], // mid level
    4: [80, 78, 75, 72, 68, 65, 60],        // low falling
    5: [75, 72, 70, 72, 78, 85, 95],        // low rising
    6: [80, 80, 78, 78, 77, 76, 75],        // low level
  };
  return contours[tone] || contours[1];
}

// ===== SVG CHART COMPONENTS =====
const BarChart = ({ data, width = 500, height = 250 }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.count));
  const barW = Math.max(12, (width - 80) / data.length - 4);
  const chartH = height - 60;
  
  return h('svg', { width: '100%', height, viewBox: `0 0 ${width} ${height}`, style: { overflow: 'visible' } },
    // Y axis
    h('line', { x1: 50, y1: 20, x2: 50, y2: chartH + 20, stroke: '#ddd', strokeWidth: 1 }),
    // Bars
    ...data.map((d, i) => {
      const barH = (d.count / maxVal) * chartH;
      const x = 60 + i * (barW + 4);
      const y = chartH + 20 - barH;
      const color = d.type === 'initial' ? '#2A7B88' : '#E8836B';
      return h('g', { key: i },
        h('rect', {
          x, y, width: barW, height: barH,
          fill: color, rx: 3,
          opacity: 0.85,
          style: { animation: `progressFill 0.6s ease ${i * 0.05}s both` }
        }),
        h('text', {
          x: x + barW / 2, y: height - 5,
          textAnchor: 'middle', fontSize: 9, fill: '#666',
          fontFamily: 'IBM Plex Mono'
        }, d.label),
        h('text', {
          x: x + barW / 2, y: y - 5,
          textAnchor: 'middle', fontSize: 9, fill: '#444',
          fontFamily: 'IBM Plex Mono'
        }, d.count),
      );
    }),
  );
};

const RadarChart = ({ data, size = 260 }) => {
  if (!data) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 40;
  const n = data.labels.length;
  
  const getPoint = (idx, val) => {
    const angle = (Math.PI * 2 * idx / n) - Math.PI / 2;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  };
  
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const normPath = data.norm.map((v, i) => getPoint(i, v)).map((p, i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ') + 'Z';
  const childPath = data.child.map((v, i) => getPoint(i, v)).map((p, i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return h('svg', { width: '100%', height: size, viewBox: `0 0 ${size} ${size}` },
    // Grid
    ...gridLevels.map(level =>
      h('polygon', {
        key: level,
        points: Array.from({length: n}, (_, i) => getPoint(i, level)).map(p => `${p.x},${p.y}`).join(' '),
        fill: 'none', stroke: '#e0e0e0', strokeWidth: 0.5
      })
    ),
    // Axes
    ...data.labels.map((_, i) => {
      const p = getPoint(i, 1);
      return h('line', { key: i, x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: '#e0e0e0', strokeWidth: 0.5 });
    }),
    // Norm area
    h('path', { d: normPath, fill: 'rgba(180,167,214,0.2)', stroke: '#B4A7D6', strokeWidth: 1.5 }),
    // Child area
    h('path', { d: childPath, fill: 'rgba(42,123,136,0.2)', stroke: '#2A7B88', strokeWidth: 2 }),
    // Labels
    ...data.labels.map((label, i) => {
      const p = getPoint(i, 1.18);
      return h('text', { key: 'l'+i, x: p.x, y: p.y, textAnchor: 'middle', dominantBaseline: 'middle', fontSize: 11, fill: '#555' }, label);
    }),
    // Dots
    ...data.child.map((v, i) => {
      const p = getPoint(i, v);
      return h('circle', { key: 'c'+i, cx: p.x, cy: p.y, r: 3.5, fill: '#2A7B88' });
    }),
  );
};

const DonutGauge = ({ value, size = 200, label }) => {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(1, value / 100);
  const offset = circumference * (1 - progress);
  
  let color = '#7ECDB0';
  let statusText = '正常範圍';
  if (value > 75) { color = '#E85D4A'; statusText = '明顯偏差'; }
  else if (value > 50) { color = '#E8836B'; statusText = '建議評估'; }
  else if (value > 25) { color = '#F0C040'; statusText = '需要留意'; }
  
  return h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
    h('circle', { cx: size/2, cy: size/2, r, fill: 'none', stroke: '#eee', strokeWidth: 14 }),
    h('circle', {
      cx: size/2, cy: size/2, r, fill: 'none', stroke: color, strokeWidth: 14,
      strokeLinecap: 'round', strokeDasharray: circumference, strokeDashoffset: offset,
      transform: `rotate(-90 ${size/2} ${size/2})`,
      style: { animation: 'gaugeAnim 1.2s ease-out', transition: 'stroke-dashoffset 1s ease' }
    }),
    h('text', { x: size/2, y: size/2 - 8, textAnchor: 'middle', fontSize: 32, fontWeight: 700, fill: color, fontFamily: 'IBM Plex Mono' }, value + '%'),
    h('text', { x: size/2, y: size/2 + 18, textAnchor: 'middle', fontSize: 13, fill: '#666' }, statusText),
    label && h('text', { x: size/2, y: size/2 + 36, textAnchor: 'middle', fontSize: 11, fill: '#999' }, label),
  );
};

const LineChart = ({ data, width = 600, height = 280 }) => {
  if (!data || data.length === 0) return null;
  const padL = 50, padR = 20, padT = 20, padB = 50;
  const cw = width - padL - padR, ch = height - padT - padB;
  const maxY = 100, minY = 0;
  
  const getX = (i) => padL + (i / (data.length - 1)) * cw;
  const getY = (v) => padT + ch - ((v - minY) / (maxY - minY)) * ch;
  
  const normPoints = data.map((d, i) => `${getX(i)},${getY(d.normScore)}`).join(' ');
  
  const childPoint = data.find(d => d.childScore !== null);
  const childIdx = data.indexOf(childPoint);
  
  return h('svg', { width: '100%', height, viewBox: `0 0 ${width} ${height}` },
    // Grid
    ...[0, 25, 50, 75, 100].map(v =>
      h('g', { key: v },
        h('line', { x1: padL, y1: getY(v), x2: width - padR, y2: getY(v), stroke: '#eee', strokeWidth: 1 }),
        h('text', { x: padL - 8, y: getY(v) + 4, textAnchor: 'end', fontSize: 10, fill: '#999', fontFamily: 'IBM Plex Mono' }, v),
      )
    ),
    // Norm line
    h('polyline', { points: normPoints, fill: 'none', stroke: '#B4A7D6', strokeWidth: 2 }),
    // Norm dots
    ...data.map((d, i) =>
      h('circle', { key: i, cx: getX(i), cy: getY(d.normScore), r: 3, fill: '#B4A7D6' })
    ),
    // Child point
    childPoint && h('circle', {
      cx: getX(childIdx), cy: getY(childPoint.childScore), r: 7, fill: '#2A7B88',
      stroke: 'white', strokeWidth: 2,
    }),
    childPoint && h('text', {
      x: getX(childIdx), y: getY(childPoint.childScore) - 14,
      textAnchor: 'middle', fontSize: 12, fontWeight: 700, fill: '#2A7B88', fontFamily: 'IBM Plex Mono'
    }, childPoint.childScore),
    // X labels
    ...data.filter((_, i) => i % 2 === 0).map((d, i) => {
      const origIdx = data.indexOf(d);
      return h('text', {
        key: 'xl' + i, x: getX(origIdx), y: height - 8,
        textAnchor: 'middle', fontSize: 9, fill: '#888'
      }, d.label);
    }),
    // Legend
    h('rect', { x: width - 160, y: 8, width: 12, height: 3, fill: '#B4A7D6', rx: 1 }),
    h('text', { x: width - 144, y: 12, fontSize: 10, fill: '#888' }, '同齡常模'),
    h('circle', { cx: width - 154, cy: 24, r: 4, fill: '#2A7B88' }),
    h('text', { x: width - 144, y: 28, fontSize: 10, fill: '#888' }, '此兒童'),
  );
};

const MiniBar = ({ value, maxVal = 100, color = '#2A7B88', height = 8 }) => {
  const pct = Math.min(100, (value / maxVal) * 100);
  return h('div', { className: 'w-full bg-gray-100 rounded-full', style: { height } },
    h('div', {
      className: 'rounded-full transition-all duration-1000',
      style: { width: pct + '%', height, background: color }
    })
  );
};

// ===== WAVEFORM CANVAS COMPONENT =====
const WaveformCanvas = ({ audioBuffer, analysisData, audioRef }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    const data = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;
    
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    
    // Visible range
    const visibleDuration = duration / zoom;
    const startTime = scrollX * (duration - visibleDuration);
    const endTime = startTime + visibleDuration;
    const startSample = Math.floor((startTime / duration) * data.length);
    const endSample = Math.floor((endTime / duration) * data.length);
    const samplesPerPixel = Math.max(1, Math.floor((endSample - startSample) / w));
    
    // Draw syllable backgrounds
    if (analysisData?.transcription) {
      const colors = ['rgba(42,123,136,0.15)', 'rgba(232,131,107,0.12)', 'rgba(180,167,214,0.12)', 'rgba(126,205,176,0.12)'];
      analysisData.transcription.forEach((seg, i) => {
        if (seg.startTime >= startTime && seg.startTime <= endTime) {
          const x1 = ((seg.startTime - startTime) / visibleDuration) * w;
          const x2 = ((seg.endTime - startTime) / visibleDuration) * w;
          ctx.fillStyle = colors[i % colors.length];
          ctx.fillRect(x1, 0, x2 - x1, h);
          
          // Syllable boundary
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(x1, 0);
          ctx.lineTo(x1, h);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Label
          if (x2 - x1 > 20) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '10px "Noto Sans TC"';
            ctx.textAlign = 'center';
            ctx.fillText(seg.chars, (x1 + x2) / 2, 16);
          }
        }
      });
    }
    
    // Draw waveform
    const mid = h / 2;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    
    for (let px = 0; px < w; px++) {
      const sampleIdx = startSample + px * samplesPerPixel;
      let min = 1, max = -1;
      for (let j = 0; j < samplesPerPixel && sampleIdx + j < data.length; j++) {
        const val = data[sampleIdx + j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      
      const gradient = ctx.createLinearGradient(px, mid + min * mid, px, mid + max * mid);
      gradient.addColorStop(0, '#2A7B88');
      gradient.addColorStop(0.5, '#3A9BAA');
      gradient.addColorStop(1, '#7ECDB0');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(px, mid + min * mid * 0.8, 1, (max - min) * mid * 0.8);
    }
    
    // Time axis
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    const timeStep = visibleDuration > 10 ? 2 : visibleDuration > 5 ? 1 : 0.5;
    for (let t = Math.ceil(startTime / timeStep) * timeStep; t <= endTime; t += timeStep) {
      const x = ((t - startTime) / visibleDuration) * w;
      ctx.fillText(t.toFixed(1) + 's', x, h - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x, 0, 1, h - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
    }
    
    // Playback cursor
    if (audioRef?.current && !audioRef.current.paused) {
      const currentTime = audioRef.current.currentTime;
      if (currentTime >= startTime && currentTime <= endTime) {
        const cursorX = ((currentTime - startTime) / visibleDuration) * w;
        ctx.strokeStyle = '#E8836B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cursorX, 0);
        ctx.lineTo(cursorX, h);
        ctx.stroke();
      }
      animRef.current = requestAnimationFrame(draw);
    }
  }, [audioBuffer, analysisData, zoom, scrollX, audioRef]);

  useEffect(() => { draw(); return () => animRef.current && cancelAnimationFrame(animRef.current); }, [draw]);

  useEffect(() => {
    const handlePlay = () => { animRef.current = requestAnimationFrame(draw); };
    const audio = audioRef?.current;
    if (audio) {
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('timeupdate', draw);
      return () => { audio.removeEventListener('play', handlePlay); audio.removeEventListener('timeupdate', draw); };
    }
  }, [audioRef, draw]);

  return h('div', { className: 'waveform-container' },
    h('canvas', {
      ref: canvasRef,
      style: { width: '100%', height: 200, borderRadius: 8, cursor: 'crosshair' },
      onClick: (e) => {
        if (!audioRef?.current || !audioBuffer) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const visibleDuration = audioBuffer.duration / zoom;
        const startTime = scrollX * (audioBuffer.duration - visibleDuration);
        audioRef.current.currentTime = startTime + x * visibleDuration;
        audioRef.current.play();
      }
    }),
    h('div', { className: 'flex items-center gap-3 mt-2' },
      h('button', {
        className: 'px-3 py-1 text-sm rounded bg-teal/10 text-teal hover:bg-teal/20 transition font-mono',
        onClick: () => setZoom(z => Math.max(1, z / 1.5))
      }, '−'),
      h('span', { className: 'text-xs text-gray-500 font-mono' }, zoom.toFixed(1) + 'x'),
      h('button', {
        className: 'px-3 py-1 text-sm rounded bg-teal/10 text-teal hover:bg-teal/20 transition font-mono',
        onClick: () => setZoom(z => Math.min(20, z * 1.5))
      }, '+'),
      zoom > 1 && h('input', {
        type: 'range', min: 0, max: 1, step: 0.01, value: scrollX,
        className: 'flex-1 accent-teal',
        onChange: (e) => setScrollX(parseFloat(e.target.value))
      }),
    ),
  );
};


// ===== MAIN APP =====
const App = () => {
  const [phase, setPhase] = useState('landing'); // landing, age-input, analyzing, results
  const [lang, setLang] = useState('zh');
  const [darkMode, setDarkMode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [childAge, setChildAge] = useState({ years: 4, months: 0 });
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisData, setAnalysisData] = useState(null);
  const [activeSection, setActiveSection] = useState('transcription');
  const [exportOptions, setExportOptions] = useState({ transcription: true, syllable: true, scores: true, report: true });
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tongyu_latest_analysis');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAnalysisData(parsed);
        // Don't auto-show results; stay on landing
      }
      const prefs = localStorage.getItem('tongyu_preferences');
      if (prefs) {
        const p = JSON.parse(prefs);
        if (p.language) setLang(p.language);
        if (p.darkMode) setDarkMode(p.darkMode);
      }
    } catch (e) {}
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('tongyu_preferences', JSON.stringify({ language: lang, darkMode }));
  }, [lang, darkMode]);

  // Dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    if (!f.name.match(/\.(mp3|wav)$/i)) {
      alert(lang === 'zh' ? '請上載 .mp3 或 .wav 格式的音檔' : 'Please upload .mp3 or .wav files');
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setAudioUrl(url);
    
    // Decode audio
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const arrayBuffer = await f.arrayBuffer();
      const buffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);
      setAudioDuration(buffer.duration);
    } catch (e) {
      console.error('Audio decode error:', e);
    }
  }, [lang]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, [handleFile]);

  const startAnalysis = useCallback(() => {
    setPhase('analyzing');
    setAnalysisStep(0);
    
    const steps = [0, 1, 2, 3, 4, 5];
    const delays = [600, 1200, 1800, 2600, 3400, 4200];
    
    steps.forEach((step, i) => {
      setTimeout(() => {
        setAnalysisStep(step + 1);
      }, delays[i]);
    });
    
    setTimeout(() => {
      const data = generateDemoData(childAge);
      data.fileName = file?.name || 'demo_sample.wav';
      data.fileSize = file?.size || 1024000;
      data.duration = audioDuration || data.totalDuration;
      data.childAge = childAge;
      data.dateAnalyzed = new Date().toISOString();
      data.id = generateId();
      
      setAnalysisData(data);
      setPhase('results');
      
      // Save
      try {
        localStorage.setItem('tongyu_latest_analysis', JSON.stringify(data));
        const history = JSON.parse(localStorage.getItem('tongyu_history') || '[]');
        history.unshift({
          id: data.id, fileName: data.fileName,
          childAge: data.childAge, dateAnalyzed: data.dateAnalyzed,
          overallScore: data.overallDeviation
        });
        localStorage.setItem('tongyu_history', JSON.stringify(history.slice(0, 10)));
      } catch (e) {}
    }, 4800);
  }, [childAge, file, audioDuration]);

  const startDemo = useCallback(() => {
    setChildAge({ years: 4, months: 6 });
    setFile({ name: 'demo_cantonese_child.wav', size: 2048000 });
    setAudioDuration(8.5);
    
    // Generate a simple demo audio buffer
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const sampleRate = 44100;
      const dur = 8.5;
      const buf = audioContextRef.current.createBuffer(1, sampleRate * dur, sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        const t = i / sampleRate;
        // Simulate speech-like waveform with amplitude variations
        const envelope = Math.sin(t * 0.8) * 0.3 + 0.5;
        const syllableEnv = Math.max(0, Math.sin(t * 4) * 0.5 + 0.3);
        ch[i] = (Math.sin(t * 200 + Math.sin(t * 5) * 50) * 0.3 +
                 Math.sin(t * 350) * 0.15 +
                 (Math.random() - 0.5) * 0.1) * envelope * syllableEnv;
      }
      setAudioBuffer(buf);
    } catch (e) {}
    
    setPhase('age-input');
  }, []);

  const exportJSON = useCallback(() => {
    if (!analysisData) return;
    const exportData = {};
    if (exportOptions.transcription) exportData.transcription = analysisData.transcription;
    if (exportOptions.syllable) {
      exportData.initials = analysisData.detectedInitials;
      exportData.finals = analysisData.detectedFinals;
      exportData.tones = analysisData.detectedTones;
    }
    if (exportOptions.scores) {
      exportData.scores = analysisData.scores;
      exportData.overallDeviation = analysisData.overallDeviation;
      exportData.percentile = analysisData.percentile;
    }
    if (exportOptions.report) exportData.processes = analysisData.processes;
    exportData.metadata = {
      fileName: analysisData.fileName,
      childAge: analysisData.childAge,
      dateAnalyzed: analysisData.dateAnalyzed,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `speech_analysis_${dateStr}_${analysisData.fileName?.replace(/\.[^.]+$/, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysisData, exportOptions]);

  const exportCSV = useCallback(() => {
    if (!analysisData) return;
    let csv = 'Section,Item,Value,Unit\n';
    
    if (exportOptions.scores) {
      csv += `Scores,Initial Accuracy,${analysisData.scores.initialAccuracy},%\n`;
      csv += `Scores,Final Accuracy,${analysisData.scores.finalAccuracy},%\n`;
      csv += `Scores,Tone Accuracy,${analysisData.scores.toneAccuracy},%\n`;
      csv += `Scores,Syllable Structure,${analysisData.scores.syllableStructure},%\n`;
      csv += `Scores,Intelligibility,${analysisData.scores.intelligibility},%\n`;
      csv += `Scores,Overall Deviation,${analysisData.overallDeviation},%\n`;
      csv += `Scores,Percentile,${analysisData.percentile},th\n`;
    }
    
    if (exportOptions.syllable) {
      Object.entries(analysisData.detectedInitials).forEach(([k, v]) => {
        csv += `Initials,${k},${v},count\n`;
      });
      Object.entries(analysisData.detectedFinals).forEach(([k, v]) => {
        csv += `Finals,${k},${v},count\n`;
      });
      Object.entries(analysisData.detectedTones).forEach(([k, v]) => {
        csv += `Tones,Tone ${k},${v},count\n`;
      });
    }
    
    if (exportOptions.transcription) {
      analysisData.transcription.forEach((t, i) => {
        csv += `Transcription,${t.chars},${t.jyutping},confidence:${t.confidence}%\n`;
      });
    }
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `speech_analysis_${dateStr}_${analysisData.fileName?.replace(/\.[^.]+$/, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysisData, exportOptions]);

  const t = useCallback((zh, en) => lang === 'zh' ? zh : en, [lang]);

  // ===== RENDER HEADER =====
  const renderHeader = () => {
    return h('header', {
      className: 'sticky top-0 z-50 backdrop-blur-lg border-b no-print',
      style: { background: darkMode ? 'rgba(26,26,46,0.9)' : 'rgba(247,245,242,0.9)', borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }
    },
      h('div', { className: 'max-w-7xl mx-auto px-4 py-3 flex items-center justify-between' },
        h('div', { className: 'flex items-center gap-3 cursor-pointer', onClick: () => { setPhase('landing'); setFile(null); setAudioUrl(null); setAudioBuffer(null); } },
          // Logo
          h('div', { className: 'w-10 h-10 rounded-xl flex items-center justify-center', style: { background: 'linear-gradient(135deg, #2A7B88, #7ECDB0)' } },
            h('svg', { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 2 },
              h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
              h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
              h('line', { x1: 12, y1: 19, x2: 12, y2: 23 }),
              h('line', { x1: 8, y1: 23, x2: 16, y2: 23 }),
            ),
          ),
          h('div', null,
            h('h1', { className: 'text-lg font-bold', style: { color: '#2A7B88' } }, '童語分析'),
            h('p', { className: 'text-xs opacity-60 hidden sm:block' }, t('專為粵語兒童語音發展評估而設', 'Cantonese children speech assessment')),
          ),
        ),
        h('div', { className: 'flex items-center gap-2' },
          // Dark mode
          h('button', {
            className: 'p-2 rounded-lg hover:bg-black/5 transition text-sm',
            onClick: () => setDarkMode(d => !d),
            'aria-label': 'Toggle dark mode'
          }, darkMode ? '☀️' : '🌙'),
          // Language toggle
          h('button', {
            className: 'px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition',
            style: { background: 'rgba(42,123,136,0.1)', color: '#2A7B88' },
            onClick: () => setLang(l => l === 'zh' ? 'en' : 'zh')
          }, lang === 'zh' ? 'EN' : '中文'),
          // Help
          h('button', {
            className: 'p-2 rounded-lg hover:bg-black/5 transition',
            onClick: () => setShowHelp(true),
            'aria-label': 'Help'
          }, h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
            h('circle', { cx: 12, cy: 12, r: 10 }),
            h('path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }),
            h('line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }),
          )),
        ),
      ),
    );
  };

  // ===== HELP OVERLAY =====
  const renderHelp = () => {
    if (!showHelp) return null;
    return h('div', {
      className: 'fixed inset-0 z-[100] flex items-center justify-center p-4',
      style: { background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' },
      onClick: () => setShowHelp(false)
    },
      h('div', {
        className: 'card max-w-lg w-full animate-slide-up',
        onClick: e => e.stopPropagation()
      },
        h('div', { className: 'flex items-center justify-between mb-4' },
          h('h2', { className: 'text-xl font-bold', style: { color: '#2A7B88' } }, t('使用說明', 'How to Use')),
          h('button', { onClick: () => setShowHelp(false), className: 'p-1 hover:bg-gray-100 rounded' }, '✕'),
        ),
        h('div', { className: 'space-y-3 text-sm leading-relaxed' },
          h('p', null, t(
            '「童語分析」是一個為粵語兒童設計的語音評估工具原型。上載兒童的語音錄音，工具會進行波形分析、音節分割和語音轉錄，並與同齡常模進行比較。',
            'TongYu Analysis is a speech assessment prototype for Cantonese-speaking children. Upload a child\'s speech recording and the tool will analyze waveforms, segment syllables, transcribe speech, and compare against age norms.'
          )),
          // h('p', { className: 'font-medium', style: { color: '#E8836B' } }, t(
          //   '⚠️ 本工具為示範原型，分析結果為模擬數據，僅供展示用途。',
          //   '⚠️ This is a demo prototype. Analysis results are simulated for demonstration purposes.'
          // )),
          h('ol', { className: 'list-decimal pl-5 space-y-1' },
            h('li', null, t('上載 .mp3 或 .wav 格式音檔', 'Upload .mp3 or .wav audio file')),
            h('li', null, t('輸入兒童年齡', 'Enter child\'s age')),
            h('li', null, t('查看分析結果', 'Review analysis results')),
            h('li', null, t('匯出報告', 'Export reports')),
          ),
        ),
      ),
    );
  };

  // ===== LANDING VIEW =====
  const renderLanding = () => {
    return h('div', { className: 'max-w-3xl mx-auto px-4 py-12 animate-fade-in' },
      // Hero
      h('div', { className: 'text-center mb-10' },
        h('div', { className: 'animate-float inline-block mb-6' },
          h('div', {
            className: 'w-20 h-20 rounded-2xl mx-auto flex items-center justify-center',
            style: { background: 'linear-gradient(135deg, #2A7B88, #7ECDB0)' }
          },
            h('svg', { width: 40, height: 40, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 1.5 },
              h('path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }),
              h('path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }),
              h('line', { x1: 12, y1: 19, x2: 12, y2: 23 }),
              h('line', { x1: 8, y1: 23, x2: 16, y2: 23 }),
            ),
          ),
        ),
        h('h2', { className: 'text-3xl font-bold mb-3', style: { color: '#2A7B88' } },
          t('兒童語音評估工具', 'Children\'s Speech Analysis')
        ),
        h('p', { className: 'text-base opacity-60 max-w-md mx-auto' },
          t('上載粵語兒童的語音錄音，獲得詳盡的語音分析報告', 'Upload Cantonese children\'s speech recordings for detailed analysis reports')
        ),
      ),
      
      // Upload Zone
      h('div', {
        className: `upload-zone card text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`,
        style: {
          border: '2px dashed',
          borderColor: dragOver ? '#2A7B88' : '#ccc',
          background: file ? 'white' : 'linear-gradient(135deg, rgba(42,123,136,0.03), rgba(180,167,214,0.05))',
          padding: '48px 24px',
        },
        onDragOver: (e) => { e.preventDefault(); setDragOver(true); },
        onDragLeave: () => setDragOver(false),
        onDrop: handleDrop,
        onClick: () => !file && fileInputRef.current?.click(),
      },
        h('input', {
          ref: fileInputRef,
          type: 'file',
          accept: '.mp3,.wav',
          className: 'hidden',
          onChange: (e) => handleFile(e.target.files[0]),
        }),
        
        !file ? h('div', null,
          h('svg', { className: 'mx-auto mb-4 opacity-40', width: 56, height: 56, viewBox: '0 0 24 24', fill: 'none', stroke: '#2A7B88', strokeWidth: 1.5 },
            h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
            h('polyline', { points: '17 8 12 3 7 8' }),
            h('line', { x1: 12, y1: 3, x2: 12, y2: 15 }),
          ),
          h('p', { className: 'text-lg font-medium mb-1' }, t('拖放音檔到此處', 'Drag & drop audio file here')),
          h('p', { className: 'text-sm opacity-50 mb-4' }, t('支援 .mp3 及 .wav 格式', 'Supports .mp3 and .wav formats')),
          h('button', {
            className: 'px-6 py-2 rounded-xl text-sm font-medium text-white transition hover:shadow-lg',
            style: { background: 'linear-gradient(135deg, #2A7B88, #3A9BAA)' },
            onClick: (e) => { e.stopPropagation(); fileInputRef.current?.click(); }
          }, t('瀏覽檔案', 'Browse Files')),
        ) : h('div', { className: 'animate-slide-up' },
          // File info
          h('div', { className: 'flex items-center justify-center gap-3 mb-4' },
            h('div', { className: 'w-10 h-10 rounded-xl flex items-center justify-center', style: { background: 'rgba(42,123,136,0.1)' } },
              h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#2A7B88', strokeWidth: 2 },
                h('path', { d: 'M9 18V5l12-2v13' }),
                h('circle', { cx: 6, cy: 18, r: 3 }),
                h('circle', { cx: 18, cy: 16, r: 3 }),
              ),
            ),
            h('div', { className: 'text-left' },
              h('p', { className: 'font-medium text-sm' }, file.name),
              h('p', { className: 'text-xs opacity-50' },
                formatFileSize(file.size) + (audioDuration ? ` · ${formatDuration(audioDuration)}` : '')
              ),
            ),
            h('button', {
              className: 'ml-2 p-1 rounded hover:bg-gray-100',
              onClick: (e) => { e.stopPropagation(); setFile(null); setAudioUrl(null); setAudioBuffer(null); }
            }, '✕'),
          ),
          // Audio player
          audioUrl && h('audio', {
            ref: audioRef,
            src: audioUrl,
            controls: true,
            className: 'mx-auto mb-4',
            style: { height: 36, maxWidth: 300 },
          }),
          // Start button
          h('button', {
            className: 'px-8 py-3 rounded-xl text-white font-bold text-base transition hover:shadow-xl pulse-glow',
            style: { background: 'linear-gradient(135deg, #2A7B88, #3A9BAA)' },
            onClick: (e) => { e.stopPropagation(); setPhase('age-input'); }
          }, t('開始分析', 'Start Analysis')),
        ),
      ),
      
      // Demo button
      h('div', { className: 'text-center mt-6' },
        h('button', {
          className: 'px-6 py-2.5 rounded-xl text-sm font-medium transition hover:shadow-md',
          style: { background: 'rgba(180,167,214,0.15)', color: '#9B8CC4' },
          onClick: startDemo,
        },
          t('🎯 試用示範模式', '🎯 Try Demo Mode'),
        ),
      ),
    );
  };

  // ===== AGE INPUT =====
  const renderAgeInput = () => {
    return h('div', { className: 'max-w-md mx-auto px-4 py-16 text-center animate-slide-up' },
      h('div', { className: 'card' },
        h('div', { className: 'w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center', style: { background: 'linear-gradient(135deg, rgba(42,123,136,0.1), rgba(126,205,176,0.1))' } },
          h('span', { className: 'text-3xl' }, '👶'),
        ),
        h('h2', { className: 'text-xl font-bold mb-2', style: { color: '#2A7B88' } },
          t('請輸入兒童年齡', 'Enter Child\'s Age')
        ),
        h('p', { className: 'text-sm opacity-50 mb-6' },
          t('用於與同齡常模比較', 'Used for age-norm comparison')
        ),
        h('div', { className: 'flex items-center justify-center gap-4 mb-8' },
          h('div', null,
            h('label', { className: 'text-xs font-medium opacity-60 block mb-1' }, t('歲', 'Years')),
            h('select', {
              className: 'w-20 p-2 rounded-xl border text-center text-lg font-mono focus:outline-none focus:ring-2',
              style: { borderColor: '#ddd', focusRingColor: '#2A7B88' },
              value: childAge.years,
              onChange: (e) => setChildAge(a => ({ ...a, years: parseInt(e.target.value) })),
            },
              ...Array.from({ length: 8 }, (_, i) => i + 1).map(y =>
                h('option', { key: y, value: y }, y)
              ),
            ),
          ),
          h('span', { className: 'text-2xl font-light opacity-30 mt-4' }, ':'),
          h('div', null,
            h('label', { className: 'text-xs font-medium opacity-60 block mb-1' }, t('月', 'Months')),
            h('select', {
              className: 'w-20 p-2 rounded-xl border text-center text-lg font-mono focus:outline-none focus:ring-2',
              style: { borderColor: '#ddd' },
              value: childAge.months,
              onChange: (e) => setChildAge(a => ({ ...a, months: parseInt(e.target.value) })),
            },
              ...Array.from({ length: 12 }, (_, i) => i).map(m =>
                h('option', { key: m, value: m }, m)
              ),
            ),
          ),
        ),
        h('button', {
          className: 'w-full py-3 rounded-xl text-white font-bold transition hover:shadow-lg pulse-glow',
          style: { background: 'linear-gradient(135deg, #2A7B88, #3A9BAA)' },
          onClick: startAnalysis,
        }, t('開始分析 →', 'Start Analysis →')),
      ),
    );
  };

  // ===== ANALYZING =====
  const renderAnalyzing = () => {
    const steps = [
      { zh: '讀取音檔', en: 'Reading audio file' },
      { zh: '語音波形分析', en: 'Waveform analysis' },
      { zh: '音節分割', en: 'Syllable segmentation' },
      { zh: '語音轉錄', en: 'Speech transcription' },
      { zh: '常模比較', en: 'Norm comparison' },
      { zh: '報告生成', en: 'Report generation' },
    ];
    
    return h('div', { className: 'max-w-md mx-auto px-4 py-16 text-center' },
      h('div', { className: 'card' },
        // Wave animation
        h('div', { className: 'mb-6 flex justify-center' },
          ...Array.from({ length: 5 }, (_, i) =>
            h('span', { key: i, className: 'wave-bar' })
          ),
        ),
        h('h2', { className: 'text-xl font-bold mb-6', style: { color: '#2A7B88' } },
          t('正在分析語音...', 'Analyzing speech...')
        ),
        h('div', { className: 'space-y-3 text-left' },
          ...steps.map((step, i) => {
            const completed = analysisStep > i;
            const active = analysisStep === i + 1;
            return h('div', {
              key: i,
              className: `flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${completed ? 'opacity-60' : active ? '' : 'opacity-30'}`,
              style: active ? { background: 'rgba(42,123,136,0.06)' } : {},
            },
              h('div', {
                className: 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 transition-all',
                style: {
                  background: completed ? '#7ECDB0' : active ? '#2A7B88' : '#eee',
                  color: completed || active ? 'white' : '#999',
                }
              }, completed ? '✓' : (i + 1)),
              h('span', { className: 'text-sm', style: { color: active ? '#2A7B88' : undefined } },
                t(step.zh, step.en)
              ),
              active && h('div', { className: 'ml-auto' },
                h('div', {
                  className: 'w-4 h-4 border-2 border-t-transparent rounded-full animate-spin',
                  style: { borderColor: '#2A7B88', borderTopColor: 'transparent' }
                }),
              ),
            );
          }),
        ),
      ),
    );
  };

  // ===== RESULTS DASHBOARD =====
  const renderResults = () => {
    if (!analysisData) return null;
    
    const sections = [
      { id: 'transcription', icon: '📝', label: t('語音轉錄', 'Transcription') },
      { id: 'waveform', icon: '🌊', label: t('波形圖', 'Waveform') },
      { id: 'syllable', icon: '📊', label: t('音節分析', 'Syllable Analysis') },
      { id: 'discrimination', icon: '📈', label: t('差異指數', 'Discrimination Index') },
      { id: 'report', icon: '📋', label: t('綜合報告', 'Summary Report') },
      { id: 'export', icon: '⬇️', label: t('匯出資料', 'Export Data') },
    ];
    
    return h('div', { className: 'flex min-h-screen' },
      // Side nav (desktop)
      h('nav', {
        className: 'side-nav w-52 fixed left-0 top-16 bottom-0 py-6 px-2 overflow-y-auto hidden lg:block no-print',
        style: { background: darkMode ? '#1A1A2E' : '#F7F5F2' }
      },
        h('div', { className: 'space-y-1' },
          ...sections.map(s =>
            h('button', {
              key: s.id,
              className: `side-nav-item w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 ${activeSection === s.id ? 'active' : ''}`,
              onClick: () => {
                setActiveSection(s.id);
                document.getElementById('section-' + s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            },
              h('span', { className: 'text-base' }, s.icon),
              h('span', null, s.label),
            )
          ),
        ),
        // History
        h('div', { className: 'mt-8 px-3' },
          h('p', { className: 'text-xs font-medium opacity-40 uppercase tracking-wider mb-2' }, t('歷史記錄', 'History')),
          ...(() => {
            try {
              const history = JSON.parse(localStorage.getItem('tongyu_history') || '[]');
              return history.slice(0, 5).map((h2, i) =>
                h('div', { key: i, className: 'text-xs py-1.5 opacity-50 truncate' }, h2.fileName)
              );
            } catch (e) { return []; }
          })(),
        ),
      ),
      
      // Main content
      h('main', {
        className: 'main-content flex-1 lg:ml-52 p-4 lg:p-8 max-w-5xl',
      },
        // Section 1: Transcription
        h('section', { id: 'section-transcription', className: 'mb-10 animate-slide-up' },
          h('h2', { className: 'text-2xl font-bold mb-4 flex items-center gap-2', style: { color: '#2A7B88' } },
            '📝 ', t('語音轉錄', 'Speech Transcription'),
          ),
          h('div', { className: 'card' },
            h('div', { className: 'flex flex-wrap gap-3' },
              ...analysisData.transcription.map((seg, i) => {
                let bgColor = 'rgba(126,205,176,0.15)';
                let badgeColor = '#7ECDB0';
                if (seg.confidence < 50) { bgColor = 'rgba(232,131,107,0.15)'; badgeColor = '#E8836B'; }
                else if (seg.confidence < 80) { bgColor = 'rgba(240,192,64,0.15)'; badgeColor = '#F0C040'; }
                
                return h('div', {
                  key: i,
                  className: 'text-center p-3 rounded-xl cursor-pointer hover:shadow-md transition group',
                  style: { background: bgColor, minWidth: 60 },
                  onClick: () => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = seg.startTime;
                      audioRef.current.play();
                    }
                  }
                },
                  h('div', { className: 'text-2xl font-bold mb-1' }, seg.chars),
                  h('div', { className: 'text-xs font-mono opacity-60 mb-1' }, seg.jyutping),
                  h('div', {
                    className: 'text-xs font-mono px-2 py-0.5 rounded-full inline-block text-white',
                    style: { background: badgeColor, fontSize: 10 }
                  }, seg.confidence + '%'),
                  h('div', { className: 'text-xs opacity-0 group-hover:opacity-50 mt-1 transition' }, '▶ ' + seg.startTime.toFixed(2) + 's'),
                );
              }),
            ),
            h('div', { className: 'mt-4 flex items-center gap-4 text-xs opacity-50' },
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 rounded-full inline-block', style: { background: '#7ECDB0' } }), t(' >80% 信心度', ' >80% confidence')),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 rounded-full inline-block', style: { background: '#F0C040' } }), t(' 50-80%', ' 50-80%')),
              h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 rounded-full inline-block', style: { background: '#E8836B' } }), t(' <50%', ' <50%')),
            ),
          ),
        ),
        
        // Audio player (hidden if no real audio)
        audioUrl && h('audio', { ref: audioRef, src: audioUrl, className: 'hidden' }),
        
        // Section 2: Waveform
        h('section', { id: 'section-waveform', className: 'mb-10 animate-slide-up', style: { animationDelay: '0.1s' } },
          h('h2', { className: 'text-2xl font-bold mb-4 flex items-center gap-2', style: { color: '#2A7B88' } },
            '🌊 ', t('波形圖', 'Waveform'),
          ),
          h('div', { className: 'card p-4' },
            audioBuffer
              ? h(WaveformCanvas, { audioBuffer, analysisData, audioRef })
              : h('div', { className: 'text-center py-12 opacity-40' }, t('（示範模式 - 未載入實際音檔）', '(Demo mode - no actual audio loaded)')),
            // Playback controls
            h('div', { className: 'flex items-center gap-3 mt-3' },
              h('button', {
                className: 'px-4 py-2 rounded-lg text-sm font-medium text-white transition',
                style: { background: '#2A7B88' },
                onClick: () => {
                  if (audioRef.current) {
                    audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause();
                  }
                }
              }, t('播放 / 暫停', 'Play / Pause')),
              h('button', {
                className: 'px-4 py-2 rounded-lg text-sm font-medium transition',
                style: { background: 'rgba(42,123,136,0.1)', color: '#2A7B88' },
                onClick: () => { if (audioRef.current) audioRef.current.currentTime = 0; }
              }, t('重頭播放', 'Restart')),
            ),
          ),
        ),
        
        // Section 3: Syllable Analysis
        h('section', { id: 'section-syllable', className: 'mb-10 animate-slide-up', style: { animationDelay: '0.2s' } },
          h('h2', { className: 'text-2xl font-bold mb-4 flex items-center gap-2', style: { color: '#2A7B88' } },
            '📊 ', t('音節分析圖表', 'Syllable Analysis'),
          ),
          
          // Inventory table
          h('div', { className: 'card mb-6' },
            h('h3', { className: 'text-lg font-bold mb-4' }, t('音素清單', 'Phoneme Inventory')),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
              // Initials
              h('div', null,
                h('h4', { className: 'text-sm font-bold mb-2 flex items-center gap-1', style: { color: '#2A7B88' } },
                  t('聲母 Initials', 'Initials'),
                  h('span', { className: 'text-xs font-mono opacity-50 ml-1' }, `(${Object.keys(analysisData.detectedInitials).length})`),
                ),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  ...Object.entries(analysisData.detectedInitials).map(([k, v]) =>
                    h('span', {
                      key: k,
                      className: 'px-2 py-1 rounded-lg text-xs font-mono',
                      style: { background: 'rgba(42,123,136,0.1)', color: '#2A7B88' }
                    }, k, h('sup', { className: 'ml-0.5 opacity-50' }, v)),
                  ),
                ),
              ),
              // Finals
              h('div', null,
                h('h4', { className: 'text-sm font-bold mb-2 flex items-center gap-1', style: { color: '#E8836B' } },
                  t('韻母 Finals', 'Finals'),
                  h('span', { className: 'text-xs font-mono opacity-50 ml-1' }, `(${Object.keys(analysisData.detectedFinals).length})`),
                ),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  ...Object.entries(analysisData.detectedFinals).map(([k, v]) =>
                    h('span', {
                      key: k,
                      className: 'px-2 py-1 rounded-lg text-xs font-mono',
                      style: { background: 'rgba(232,131,107,0.1)', color: '#E8836B' }
                    }, k, h('sup', { className: 'ml-0.5 opacity-50' }, v)),
                  ),
                ),
              ),
              // Tones
              h('div', null,
                h('h4', { className: 'text-sm font-bold mb-2 flex items-center gap-1', style: { color: '#B4A7D6' } },
                  t('聲調 Tones', 'Tones'),
                ),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  ...Object.entries(analysisData.detectedTones).map(([k, v]) =>
                    h('span', {
                      key: k,
                      className: 'px-2 py-1 rounded-lg text-xs font-mono',
                      style: { background: 'rgba(180,167,214,0.1)', color: '#9B8CC4' }
                    }, 'T' + k, h('sup', { className: 'ml-0.5 opacity-50' }, v)),
                  ),
                ),
              ),
            ),
          ),
          
          // Charts
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
            // Bar chart
            h('div', { className: 'card' },
              h('h3', { className: 'text-sm font-bold mb-3' }, t('音素頻率分佈', 'Phoneme Frequency')),
              h(BarChart, { data: analysisData.phonemeFrequency }),
              h('div', { className: 'flex gap-4 mt-2 text-xs opacity-50' },
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-2 rounded inline-block', style: { background: '#2A7B88' } }), t('聲母', 'Initials')),
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-2 rounded inline-block', style: { background: '#E8836B' } }), t('韻母', 'Finals')),
              ),
            ),
            // Radar chart
            h('div', { className: 'card' },
              h('h3', { className: 'text-sm font-bold mb-3' }, t('音素類別對比', 'Phoneme Category Comparison')),
              h('div', { className: 'flex justify-center' },
                h(RadarChart, { data: analysisData.radarData }),
              ),
              h('div', { className: 'flex justify-center gap-4 mt-2 text-xs opacity-50' },
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-2 rounded inline-block', style: { background: '#2A7B88' } }), t('此兒童', 'Child')),
                h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-2 rounded inline-block', style: { background: '#B4A7D6' } }), t('同齡常模', 'Age norm')),
              ),
            ),
          ),
          
          // Tone contour
          h('div', { className: 'card mt-6' },
            h('h3', { className: 'text-sm font-bold mb-3' }, t('聲調輪廓圖', 'Tone Contour Chart')),
            h('svg', { width: '100%', height: 200, viewBox: '0 0 600 200' },
              // Tones
              ...analysisData.toneContours.map((tc, idx) => {
                const colors = ['#2A7B88', '#E8836B', '#B4A7D6', '#7ECDB0', '#F0C040', '#8B6DB0'];
                const xStart = 50 + idx * 90;
                const xStep = 12;
                const yScale = (v) => 200 - ((v - 50) / 120) * 160;
                
                const expectedPath = tc.expected.map((v, i) => `${i === 0 ? 'M' : 'L'}${xStart + i * xStep},${yScale(v)}`).join(' ');
                const childPath = tc.child.map((v, i) => `${i === 0 ? 'M' : 'L'}${xStart + i * xStep},${yScale(v)}`).join(' ');
                
                return h('g', { key: idx },
                  h('path', { d: expectedPath, fill: 'none', stroke: colors[idx], strokeWidth: 2, opacity: 0.4 }),
                  h('path', { d: childPath, fill: 'none', stroke: colors[idx], strokeWidth: 2.5, strokeDasharray: '4,2' }),
                  h('text', { x: xStart + 36, y: 196, textAnchor: 'middle', fontSize: 11, fill: colors[idx], fontWeight: 600 }, 'T' + tc.tone),
                );
              }),
              // Legend
              h('text', { x: 50, y: 14, fontSize: 9, fill: '#999' }, t('─ 標準  - - 兒童', '─ Expected  - - Child')),
            ),
          ),
        ),
        
        // Section 4: Discrimination Index
        h('section', { id: 'section-discrimination', className: 'mb-10 animate-slide-up', style: { animationDelay: '0.3s' } },
          h('h2', { className: 'text-2xl font-bold mb-4 flex items-center gap-2', style: { color: '#2A7B88' } },
            '📈 ', t('差異指數', 'Discrimination Index'),
          ),
          
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
            // Gauge
            h('div', { className: 'card flex flex-col items-center' },
              h('h3', { className: 'text-sm font-bold mb-4 self-start' }, t('整體差異指數', 'Overall Deviation Index')),
              h(DonutGauge, { value: analysisData.overallDeviation, size: 220 }),
              h('div', { className: 'mt-4 p-3 rounded-xl w-full text-center text-sm', style: { background: 'rgba(42,123,136,0.06)' } },
                t(
                  `此兒童的語音發展在同齡兒童中排第 ${analysisData.percentile} 百分位`,
                  `This child ranks at the ${analysisData.percentile}th percentile among peers`
                ),
              ),
            ),
            
            // Score breakdown
            h('div', { className: 'card' },
              h('h3', { className: 'text-sm font-bold mb-4' }, t('分項得分', 'Sub-scores')),
              h('div', { className: 'space-y-4' },
                ...[
                  { label: t('聲母準確度', 'Initial Accuracy'), value: analysisData.scores.initialAccuracy, tip: t('聲母是音節開頭的輔音', 'Initial consonant at syllable onset') },
                  { label: t('韻母準確度', 'Final Accuracy'), value: analysisData.scores.finalAccuracy, tip: t('韻母是音節的元音及韻尾', 'Vowel nucleus and coda') },
                  { label: t('聲調準確度', 'Tone Accuracy'), value: analysisData.scores.toneAccuracy, tip: t('粵語有六個聲調', 'Cantonese has six tones') },
                  { label: t('音節結構', 'Syllable Structure'), value: analysisData.scores.syllableStructure, tip: t('音節組成的完整度', 'Completeness of syllable structure') },
                  { label: t('語音清晰度', 'Intelligibility'), value: analysisData.scores.intelligibility, tip: t('整體語音的可理解程度', 'Overall speech comprehensibility') },
                ].map((item, i) => {
                  let color = '#7ECDB0';
                  if (item.value < 50) color = '#E8836B';
                  else if (item.value < 70) color = '#F0C040';
                  
                  return h('div', { key: i, className: 'tooltip-trigger relative' },
                    h('div', { className: 'flex items-center justify-between mb-1' },
                      h('span', { className: 'text-sm flex items-center gap-1' },
                        item.label,
                        h('span', { className: 'text-xs opacity-30 cursor-help' }, 'ⓘ'),
                      ),
                      h('span', { className: 'text-sm font-mono font-bold', style: { color } }, item.value + '%'),
                    ),
                    h(MiniBar, { value: item.value, color }),
                    h('div', {
                      className: 'tooltip-content absolute z-10 bottom-full left-0 mb-1 px-3 py-2 rounded-lg text-xs text-white max-w-xs',
                      style: { background: '#333' }
                    }, item.tip),
                  );
                }),
              ),
            ),
          ),
          
          // Age norm line chart
          h('div', { className: 'card mt-6' },
            h('h3', { className: 'text-sm font-bold mb-3' }, t('發展曲線對比', 'Developmental Curve Comparison')),
            h(LineChart, { data: analysisData.ageNormData }),
          ),
        ),
        
        // Section 5: Summary Report
        h('section', { id: 'section-report', className: 'mb-10 animate-slide-up', style: { animationDelay: '0.4s' } },
          h('h2', { className: 'text-2xl font-bold mb-4 flex items-center gap-2', style: { color: '#2A7B88' } },
            '📋 ', t('綜合報告', 'Summary Report'),
          ),
          h('div', { className: 'card' },
            // Basic info
            h('div', { className: 'mb-6 p-4 rounded-xl', style: { background: 'rgba(42,123,136,0.04)' } },
              h('h3', { className: 'text-sm font-bold mb-2', style: { color: '#2A7B88' } }, t('基本資料', 'Basic Info')),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3 text-sm' },
                h('div', null, h('span', { className: 'opacity-50' }, t('檔案：', 'File: ')), h('span', { className: 'font-mono' }, analysisData.fileName)),
                h('div', null, h('span', { className: 'opacity-50' }, t('時長：', 'Duration: ')), h('span', { className: 'font-mono' }, formatDuration(analysisData.duration))),
                h('div', null, h('span', { className: 'opacity-50' }, t('年齡：', 'Age: ')), h('span', { className: 'font-mono' }, `${analysisData.childAge.years}${t('歲', 'y')}${analysisData.childAge.months}${t('個月', 'm')}`)),
                h('div', null, h('span', { className: 'opacity-50' }, t('日期：', 'Date: ')), h('span', { className: 'font-mono' }, new Date(analysisData.dateAnalyzed).toLocaleDateString('zh-TW'))),
              ),
            ),
            
            // Overall assessment
            h('div', { className: 'mb-6' },
              h('h3', { className: 'text-sm font-bold mb-2', style: { color: '#2A7B88' } }, t('整體評估', 'Overall Assessment')),
              h('p', { className: 'text-sm leading-relaxed' },
                t(
                  `根據分析結果，此兒童（${analysisData.childAge.years}歲${analysisData.childAge.months}個月）的整體語音發展差異指數為 ${analysisData.overallDeviation}%，在同齡兒童中排第 ${analysisData.percentile} 百分位。${analysisData.overallDeviation <= 25 ? '整體語音發展處於正常範圍。' : analysisData.overallDeviation <= 50 ? '部分語音發展需要留意，建議持續觀察。' : '語音發展偏差較明顯，建議進行專業評估。'}`,
                  `Based on the analysis, this child (${analysisData.childAge.years}y${analysisData.childAge.months}m) shows an overall deviation index of ${analysisData.overallDeviation}%, ranking at the ${analysisData.percentile}th percentile among peers. ${analysisData.overallDeviation <= 25 ? 'Overall speech development is within normal range.' : analysisData.overallDeviation <= 50 ? 'Some aspects need monitoring. Continued observation recommended.' : 'Notable deviations detected. Professional assessment recommended.'}`
                ),
              ),
            ),
            
            // Strengths & Concerns in 2 columns
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6' },
              h('div', { className: 'p-4 rounded-xl', style: { background: 'rgba(126,205,176,0.1)' } },
                h('h3', { className: 'text-sm font-bold mb-2', style: { color: '#4CAF50' } }, t('✅ 強項', '✅ Strengths')),
                h('ul', { className: 'text-sm space-y-1.5' },
                  analysisData.scores.toneAccuracy >= 75 && h('li', null, t('聲調辨識能力良好', 'Good tone discrimination')),
                  analysisData.scores.intelligibility >= 70 && h('li', null, t('整體語音清晰度足夠', 'Adequate speech intelligibility')),
                  Object.keys(analysisData.detectedInitials).length >= 10 && h('li', null, t('聲母種類豐富', 'Rich initial consonant inventory')),
                  h('li', null, t('能產出多音節語句', 'Can produce multi-syllable utterances')),
                ),
              ),
              h('div', { className: 'p-4 rounded-xl', style: { background: 'rgba(232,131,107,0.1)' } },
                h('h3', { className: 'text-sm font-bold mb-2', style: { color: '#E8836B' } }, t('⚠️ 關注領域', '⚠️ Areas of Concern')),
                h('ul', { className: 'text-sm space-y-1.5' },
                  analysisData.scores.initialAccuracy < 75 && h('li', null, t('部分聲母準確度偏低', 'Some initial consonant inaccuracies')),
                  analysisData.scores.finalAccuracy < 75 && h('li', null, t('韻母產出需要加強', 'Final production needs improvement')),
                  analysisData.transcription.filter(s => s.confidence < 50).length > 0 && h('li', null, t('部分音節辨識度較低', 'Some syllables have low recognition')),
                  h('li', null, t('需持續觀察語音發展進度', 'Continue monitoring speech development')),
                ),
              ),
            ),
            
            // Phonological processes
            h('div', { className: 'mb-6' },
              h('h3', { className: 'text-sm font-bold mb-2', style: { color: '#2A7B88' } }, t('常見語音歷程分析', 'Phonological Process Analysis')),
              analysisData.processes.length === 0
                ? h('p', { className: 'text-sm opacity-50' }, t('未偵測到明顯的語音歷程', 'No significant phonological processes detected'))
                : h('div', { className: 'space-y-2' },
                    ...analysisData.processes.map((p, i) =>
                      h('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-lg', style: { background: 'rgba(232,131,107,0.06)' } },
                        h('div', { className: 'w-2 h-2 rounded-full flex-shrink-0', style: { background: '#E8836B' } }),
                        h('div', null,
                          h('span', { className: 'text-sm font-medium' }, p.name),
                          h('span', { className: 'text-xs font-mono opacity-50 ml-2' }, p.examples),
                        ),
                      )
                    ),
                  ),
            ),
            
            // Recommendations
            h('div', { className: 'p-4 rounded-xl', style: { background: 'rgba(180,167,214,0.1)' } },
              h('h3', { className: 'text-sm font-bold mb-2', style: { color: '#9B8CC4' } }, t('💡 建議', '💡 Recommendations')),
              h('ul', { className: 'text-sm space-y-1.5' },
                h('li', null, t('建議每三至六個月進行一次語音評估，以監測發展進度', 'Recommend speech assessment every 3-6 months to monitor progress')),
                analysisData.overallDeviation > 25 && h('li', null, t('建議轉介至語言治療師作進一步評估', 'Refer to speech-language therapist for further assessment')),
                analysisData.processes.length > 0 && h('li', null, t('可針對偵測到的語音歷程進行針對性訓練', 'Target detected phonological processes in therapy')),
                h('li', null, t('鼓勵家長在日常互動中示範正確語音', 'Encourage parents to model correct speech in daily interactions')),
              ),
            ),
            
            // Print button
            h('div', { className: 'mt-6 text-center no-print' },
              h('button', {
                className: 'px-6 py-2.5 rounded-xl text-sm font-medium text-white transition hover:shadow-lg',
                style: { background: '#2A7B88' },
                onClick: () => window.print()
              }, t('🖨️ 列印報告', '🖨️ Print Report')),
            ),
          ),
        ),
        
        // Section 6: Export
        h('section', { id: 'section-export', className: 'mb-10 animate-slide-up no-print', style: { animationDelay: '0.5s' } },
          h('h2', { className: 'text-2xl font-bold mb-4 flex items-center gap-2', style: { color: '#2A7B88' } },
            '⬇️ ', t('匯出資料', 'Export Data'),
          ),
          h('div', { className: 'card' },
            // Options
            h('div', { className: 'mb-6' },
              h('h3', { className: 'text-sm font-bold mb-3' }, t('選擇匯出內容', 'Select export content')),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                ...[
                  { key: 'transcription', label: t('語音轉錄', 'Transcription') },
                  { key: 'syllable', label: t('音節分析', 'Syllable Analysis') },
                  { key: 'scores', label: t('評分數據', 'Scores') },
                  { key: 'report', label: t('語音歷程', 'Processes') },
                ].map(opt =>
                  h('label', {
                    key: opt.key,
                    className: 'flex items-center gap-2 p-3 rounded-xl cursor-pointer transition text-sm',
                    style: {
                      background: exportOptions[opt.key] ? 'rgba(42,123,136,0.1)' : 'rgba(0,0,0,0.02)',
                      border: exportOptions[opt.key] ? '1px solid rgba(42,123,136,0.3)' : '1px solid transparent'
                    }
                  },
                    h('input', {
                      type: 'checkbox',
                      checked: exportOptions[opt.key],
                      onChange: () => setExportOptions(o => ({ ...o, [opt.key]: !o[opt.key] })),
                      className: 'accent-teal'
                    }),
                    opt.label,
                  )
                ),
              ),
            ),
            
            // Download buttons
            h('div', { className: 'flex gap-4 flex-wrap' },
              h('button', {
                className: 'flex-1 min-w-[180px] py-3 rounded-xl text-white font-bold text-sm transition hover:shadow-lg flex items-center justify-center gap-2',
                style: { background: 'linear-gradient(135deg, #2A7B88, #3A9BAA)' },
                onClick: exportJSON,
              },
                h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
                  h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                  h('polyline', { points: '7 10 12 15 17 10' }),
                  h('line', { x1: 12, y1: 15, x2: 12, y2: 3 }),
                ),
                t('下載 JSON', 'Download JSON'),
              ),
              h('button', {
                className: 'flex-1 min-w-[180px] py-3 rounded-xl font-bold text-sm transition hover:shadow-lg flex items-center justify-center gap-2',
                style: { background: 'rgba(232,131,107,0.15)', color: '#E8836B' },
                onClick: exportCSV,
              },
                h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 },
                  h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }),
                  h('polyline', { points: '7 10 12 15 17 10' }),
                  h('line', { x1: 12, y1: 15, x2: 12, y2: 3 }),
                ),
                t('下載 CSV', 'Download CSV'),
              ),
            ),
            
            // Preview
            h('div', { className: 'mt-6' },
              h('h3', { className: 'text-xs font-mono opacity-40 mb-2' }, t('數據預覽', 'Data Preview')),
              h('pre', {
                className: 'p-4 rounded-xl text-xs font-mono overflow-x-auto',
                style: { background: '#1a1a2e', color: '#7ECDB0', maxHeight: 200 }
              }, JSON.stringify({
                fileName: analysisData.fileName,
                childAge: analysisData.childAge,
                overallDeviation: analysisData.overallDeviation + '%',
                percentile: analysisData.percentile,
                scores: analysisData.scores,
                transcriptionSample: analysisData.transcription.slice(0, 3).map(t => t.chars + ' [' + t.jyutping + ']'),
              }, null, 2)),
            ),
          ),
        ),
      ),
    );
  };

  // ===== MAIN RENDER =====
  return h('div', { className: `min-h-screen flex flex-col ${darkMode ? 'dark' : ''}` },
    renderHeader(),
    renderHelp(),
    h('div', { className: 'flex-1' },
      phase === 'landing' && renderLanding(),
      phase === 'age-input' && renderAgeInput(),
      phase === 'analyzing' && renderAnalyzing(),
      phase === 'results' && renderResults(),
    ),
  );
};

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));