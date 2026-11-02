// build/steps-split.ts 產生的模組
declare module 'virtual:steps-core' {
  const steps: import('./types').StepCore[];
  export default steps;
}
declare module 'virtual:steps-detail' {
  const loadPart: (id: number) => Promise<{ default: Record<number, import('./types').StepDetail> }>;
  export default loadPart;
}
