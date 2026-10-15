<template>
  <canvas
    ref="canvas"
    class="pad"
    aria-label="描字板，用滑鼠或手指照著範本寫"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="end"
    @pointercancel="end"
  />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { glyphs } from '@/lib/kana';

const props = defineProps<{ char: string; guide: boolean }>();

type Pt = [number, number];
const canvas = ref<HTMLCanvasElement | null>(null);
const strokes: Pt[][] = [];
let cur: Pt[] | null = null;
let w = 0;
let dpr = 1;
const $q = useQuasar();

function pt(e: PointerEvent): Pt {
  const r = canvas.value!.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
}

function down(e: PointerEvent) {
  canvas.value!.setPointerCapture(e.pointerId);
  cur = [pt(e)];
  strokes.push(cur);
  draw();
}
function move(e: PointerEvent) {
  if (!cur) return;
  cur.push(pt(e));
  draw();
}
function end() {
  cur = null;
}

function resize() {
  const c = canvas.value;
  if (!c) return;
  const width = c.getBoundingClientRect().width;
  if (!width) return;
  dpr = window.devicePixelRatio || 1;
  c.width = Math.round(width * dpr);
  c.height = Math.round(width * dpr);
  w = width;
  draw();
}

function draw() {
  const c = canvas.value;
  const ctx = c?.getContext('2d');
  if (!c || !ctx || !w) return;
  const cs = getComputedStyle(c);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = v('--surface');
  ctx.fillRect(0, 0, w, w);
  ctx.strokeStyle = v('--grid');
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.strokeRect(0.75, 0.75, w - 1.5, w - 1.5);
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, w);
  ctx.moveTo(0, w / 2);
  ctx.lineTo(w, w / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (props.guide) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = v('--ink');
    ctx.font = `${Math.round(Math.min(w * 0.74, (w * 0.92) / glyphs(props.char)))}px ${v('--f-kana')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(props.char, w / 2, w / 2 + w * 0.03);
    ctx.restore();
  }
  ctx.strokeStyle = v('--ink');
  ctx.lineWidth = Math.max(4, w / 24);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    ctx.beginPath();
    s.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * w) : ctx.moveTo(x * w, y * w)));
    if (s.length === 1) ctx.lineTo(s[0]![0] * w + 0.1, s[0]![1] * w);
    ctx.stroke();
  }
}

function clear() {
  strokes.length = 0;
  draw();
}

watch(
  () => props.char,
  () => clear(),
);
watch(() => props.guide, draw);
watch(() => $q.dark.isActive, () => requestAnimationFrame(draw));

let ro: ResizeObserver | undefined;
onMounted(() => {
  ro = new ResizeObserver(resize);
  ro.observe(canvas.value!);
  if (document.fonts) {
    document.fonts
      .load('100px "BIZ UDMincho"', 'あかさたなはまやらわんアカサタナハマヤラワン')
      .then(draw)
      .catch(() => {});
  }
});
onBeforeUnmount(() => ro?.disconnect());

defineExpose({ clear });
</script>
