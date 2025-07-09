// 实现一个简易版 Promise 类（面试常用，支持 then 链式调用）
// 实现思路：
// 1. Promise 有三种状态：pending、fulfilled、rejected，初始为 pending。
// 2. 构造函数接收 executor(resolve, reject) 执行器，立即执行。
// 3. resolve 负责将状态变为 fulfilled，并保存 value，执行 onFulfilled 回调队列。
// 4. reject 负责将状态变为 rejected，并保存 reason，执行 onRejected 回调队列。
// 5. then 方法：
//    - 返回一个新的 Promise，实现链式调用。
//    - 如果当前已 fulfilled，异步执行 onFulfilled，并将返回值 resolve 给下一个 Promise。
//    - 如果当前已 rejected，异步执行 onRejected，并将返回值 reject 给下一个 Promise。
//    - 如果 pending，收集回调，等状态变化后再异步执行。
// 6. 只实现最基础的功能，便于面试讲解原理。

class MyPromise {
  constructor(executor) {
    this.state = "pending"; // 当前状态
    this.value = undefined; // 成功时的值
    this.reason = undefined; // 失败时的原因
    this.onFulfilledCallbacks = []; // 成功回调队列
    this.onRejectedCallbacks = []; // 失败回调队列

    // resolve 方法：将状态变为 fulfilled，保存 value，并执行所有成功回调
    const resolve = (value) => {
      if (this.state === "pending") {
        this.state = "fulfilled";
        this.value = value;
        this.onFulfilledCallbacks.forEach((fn) => fn());
      }
    };

    // reject 方法：将状态变为 rejected，保存 reason，并执行所有失败回调
    const reject = (reason) => {
      if (this.state === "pending") {
        this.state = "rejected";
        this.reason = reason;
        this.onRejectedCallbacks.forEach((fn) => fn());
      }
    };

    // 立即执行 executor，捕获异常自动 reject
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  // then 方法：注册成功/失败回调，并返回一个新的 Promise 实现链式调用
  // (then语法要求我们第一个传入函数代表的是成功，第二个函数代表的是失败) => 故我们可以根据对应的state 去选择执行哪一个函数
  then(onFulfilled, onRejected) {
    // 返回一个新的 Promise （ 其实这里就是在模拟 我们构建的Promise的行为 尝试递归调用的想法来实现无限then ）
    return new MyPromise((resolve, reject) => {
      // 如果当前已 fulfilled，异步执行 onFulfilled
      if (this.state === "fulfilled") {
        setTimeout(() => {
          try {
            const x = onFulfilled ? onFulfilled(this.value) : this.value;
            resolve(x); // 将返回值 resolve 给下一个 Promise
          } catch (e) {
            reject(e);
          }
        });
      }
      // 如果当前已 rejected，异步执行 onRejected
      else if (this.state === "rejected") {
        setTimeout(() => {
          try {
            const x = onRejected ? onRejected(this.reason) : undefined;
            reject(x); // 将返回值 reject 给下一个 Promise
          } catch (e) {
            reject(e);
          }
        });
      }
      // 如果当前为 pending，收集回调，等状态变化后再异步执行
      else if (this.state === "pending") {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onFulfilled ? onFulfilled(this.value) : this.value;
              resolve(x);
            } catch (e) {
              reject(e);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              const x = onRejected ? onRejected(this.reason) : undefined;
              reject(x);
            } catch (e) {
              reject(e);
            }
          });
        });
      }
    });
  }
}

// ================== 测试用例 ==================
// 1. 基本 resolve 测试
const p1 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("成功");
  }, 100);
});

p1.then((res) => {
  console.log("fulfilled:", res); // 应输出 fulfilled: 成功
  return "链式调用";
});

// 2. 基本 reject 测试
const p2 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    reject("失败");
  }, 100);
});

p2.then(null, (err) => {
  console.log("rejected:", err); // 应输出 rejected: 失败
});

// 3. 立即 resolve
const p3 = new MyPromise((resolve, reject) => {
  resolve("立即成功");
});

p3.then((res) => {
  console.log("fulfilled:", res); // 应输出 fulfilled: 立即成功
});

// 4. 立即 reject
const p4 = new MyPromise((resolve, reject) => {
  reject("立即失败");
});

p4.then(null, (err) => {
  console.log("rejected:", err); // 应输出 rejected: 立即失败
});

// 5. 测试链式调用
const p = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("hello");
  }, 100);
});

p.then((res) => {
  console.log("step1:", res);
  return "step2 value";
}).then((res) => {
  console.log("step2:", res);
});
