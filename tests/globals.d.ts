/* Minimal Jest global typings for editor typechecking of RTL/Jest-style tests.
   Runtime is still governed by whichever test runner you execute.
*/

declare const describe: any;
declare const it: any;
declare const test: any;
declare const beforeEach: any;
declare const afterEach: any;

declare const expect: any;

declare const jest: {
  fn: (...args: any[]) => any;
  mock: (...args: any[]) => any;
  spyOn: (...args: any[]) => any;
  clearAllMocks: (...args: any[]) => any;
  clearAllTimers: (...args: any[]) => any;
  useFakeTimers: (...args: any[]) => any;
  useRealTimers: (...args: any[]) => any;
};
