// opencc-js 沒有附型別，只宣告會用到的部分
declare module 'opencc-js/cn2t' {
  export function Converter(opt: { from: 'cn'; to: 'tw' | 'twp' | 'hk' | 'jp' }): (text: string) => string;
}
