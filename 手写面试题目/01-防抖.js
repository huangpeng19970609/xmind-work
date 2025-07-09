/*
 * @Author: 黄鹏
 * @LastEditors: 黄鹏
 * @LastEditTime: 2025-07-09 23:05:10
 * @Description: 这是一个注释
 */
// 防抖函数：在事件被触发 wait 毫秒后才执行回调，若期间再次触发则重新计时。
// immediate 为 true 时，首次触发会立即执行，之后 wait 时间内不再触发。
function debounce(fn, wait, immediate) {
  let timer;

  return function (...args) {
    // 防抖 => 总是执行最后一次 故此时需要清楚计时器
    if (timer) {
      clearTimeout(timer);
    }

    // 执行策略一: 立即执行
    if (immediate) {
      // 若为首次执行的时刻
      if (!timer) {
        fn.apply(this, args);
      }

      // timer保持非null状态 => 确保在冷却期内再次触发时，不会再次立即执行
      timer = setTimeout(() => {
        timer = null;
      }, wait);
    }
    // 执行策略二:
    else {
      timer = setTimeout(() => {
        fn.apply(this, args);
      }, wait);
    }
  };
}
