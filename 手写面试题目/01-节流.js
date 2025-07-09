// 节流函数：规定在 delay 毫秒内只会执行一次回调。
// 若多次触发，保证首尾都能执行一次。
function throttle(fn, delay) {
  let lastCall = 0;
  let timer = null;

  return function (...args) {
    const now = Date.now();
    const elapsed = now - lastCall;

    clearTimeout(timer);

    if (elapsed > delay) {
      fn.apply(this, args);
      lastCall = now;
    } else {
      timer = setTimeout(() => {
        fn.apply(this, args);
        lastCall = Date.now();
      }, delay - elapsed);
    }
  };
}

// 用法示例：
// window.addEventListener('resize', debounce(() => { console.log('防抖触发'); }, 500, true));
// window.addEventListener('scroll', throttle(() => { console.log('节流触发'); }, 500));
