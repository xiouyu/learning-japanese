import { describe, expect, it } from 'vitest';
import scenes from '@/data/talk.json';
import { START_MSG, mixedContentBlocked, ndjson, scenePrompt, splitReply, stripThink, transcript, type ChatMsg, type TalkScene } from '@/lib/talk';

describe('AI 會話', () => {
  it('回覆拆成日文和中文翻譯', () => {
    expect(splitReply('いらっしゃいませ。\n【中文】歡迎光臨。')).toEqual({ ja: 'いらっしゃいませ。', zh: '歡迎光臨。' });
    expect(splitReply('はい、どうぞ。')).toEqual({ ja: 'はい、どうぞ。', zh: '' });
    expect(splitReply('こんにちは。 [中文] 你好。')).toEqual({ ja: 'こんにちは。', zh: '你好。' });
  });

  it('拿掉推理型模型的 <think> 內容（還沒想完的也拿掉）', () => {
    expect(stripThink('<think>先想一下</think>\nこんにちは。')).toBe('こんにちは。');
    expect(stripThink('<think>還在想')).toBe('');
  });

  it('講評用的對話紀錄：拿掉系統提示、開場指令和中文翻譯', () => {
    const msgs: ChatMsg[] = [
      { role: 'system', content: 'x' },
      { role: 'user', content: START_MSG },
      { role: 'assistant', content: 'こんにちは。\n【中文】你好。' },
      { role: 'user', content: 'こんにちは' },
    ];
    expect(transcript(msgs)).toBe('AI：こんにちは。\n學習者：こんにちは');
  });

  it('https 網站連非本機的 http 會被擋，localhost 可以', () => {
    expect(mixedContentBlocked('http://localhost:11434', 'https:')).toBe(false);
    expect(mixedContentBlocked('http://127.0.0.1:11434/', 'https:')).toBe(false);
    expect(mixedContentBlocked('http://192.168.1.5:11434', 'https:')).toBe(true);
    expect(mixedContentBlocked('http://192.168.1.5:11434', 'http:')).toBe(false);
  });

  it('讀得懂分段送來的 NDJSON', async () => {
    const enc = new TextEncoder();
    const parts = ['{"message":{"content":"こ"}}\n{"mes', 'sage":{"content":"んにちは"}}\n', '{"done":true}'];
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const p of parts) c.enqueue(enc.encode(p));
        c.close();
      },
    });
    const got: unknown[] = [];
    for await (const j of ndjson(body)) got.push(j);
    expect(got).toEqual([{ message: { content: 'こ' } }, { message: { content: 'んにちは' } }, { done: true }]);
  });

  it('每個情境都有角色、目標，系統提示裡寫進去了', () => {
    for (const s of scenes as TalkScene[]) {
      expect(s.goals.length, s.id).toBeGreaterThan(0);
      const prompt = scenePrompt(s);
      expect(prompt).toContain(s.ai);
      expect(prompt).toContain('【中文】');
    }
    expect(new Set((scenes as TalkScene[]).map((s) => s.id)).size).toBe(scenes.length);
  });
});
