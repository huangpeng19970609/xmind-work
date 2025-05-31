> 卡颂的文章固然写的很好 但我觉得始终在很多地方是很难串起来的，故有了这篇。
>
> 我认为 卡颂 的文章或许可以作为一个抽象的字典去参考、去理解，里面相当的抽象概念，是文字方面无法覆盖到，或许读者无法理解的，故我们自身应该有足够的疑惑与较真，去提出疑问，得到答案，最终理解作者的想法与思路。
>
> 我认为这是react本身的复杂性与架构导致的，星星点点，思想落在各处，这并非是文章能够诠释的，我认为卡颂已经做的非常好了。
>
> https://juejin.cn/post/7348651815759282226



### 01 reactDom.renderDOM的流程是什么

1. ReactDom.render()

2. legacyCreateRootFromDOMContainer 

   - 创建 FiberRoot.current 

     你也可以称呼其为 全局的应用对象，当前的CurrentFiberTree

   -  RootFiber 

     组件树的起点

3. updateContainer 

   - 创建Update

4.  Scheduler 

   - 同步模式：立即执行 => performSyncWorkOnRoot
   - 并发模式：会通过 Scheduler 进行任务调度 => performConcurrentWorkOnRoot

5. beginWork → 构建 workInProgress Fiber 树

   - 深度优先遍历构建 workInProgress 树
   - 对比新旧 Fiber（Diff 算法），打上 effectTag（插入/更新/删除）
   - 处理生命周期（如过时的 `componentWillMount`）

6. completeWork → 收集 effect list

   - 创建 DOM 节点（对 HostComponent）
   - 收集副作用到 **effectList**（链表结构，记录需要变更的节点）

7. commitRoot → 执行 DOM 操作

   1. **Before mutation**：调用 `getSnapshotBeforeUpdate`
   2. **Mutation**：执行 DOM 操作（插入/更新/删除）
   3. **Layout**：调用生命周期（`componentDidMount`/`componentDidUpdate`）、执行回调函数

8. 更新 current Fiber 树

### 为什么要Fiber？

0. 自定义渲染器

   ⭐

1. 链表树结构替代递归

   > - 高优先级更新可中断低优先级渲染

   - 使用链表就是为了抛弃原本的递归，让其可以暂停。

2. 双缓冲机制

   - 克隆当前树创建 workInProgress 树， 直接切换指针

     （这是一种非常常见的内存换速度的性能优化手段，比如canvas的绘制）

3. 时间切片策略 

   > - 时间切片：将渲染任务拆分为 5ms 的区块
   > - 浏览器可优先处理高优先级任务
   > - 保证帧率稳定在 60fps

   render => commit 阶段中， 这个步骤是可以被中断的。

   - 可中断渲染流程

   - 基于优先级的调度
     1. Immediate（同步）：用户输入、动画
     2. User-blocking：数据加载
     3. Normal：普通更新
     4. Low：分析日志
     5. Idle：非必要任务

   

### Suspense

> 1. **异常捕获** 
>
>    - **子组件抛出 Promise** 作为“等待信号”。
>
>    - **协调器捕获并标记挂起状态**，切换为 `fallback` UI
>
>      Suspense组件，通过错误边界（Error Boundary）机制捕获这个对象， 将其设置为 “等待状态”，而非错误状态
>
> 2. Fiber标记
>
>    React 标记该子树为“挂起”（suspended）状态，并显示 `fallback` UI
>
>    当抛出的 Promise 完成（resolve）后，React 重新尝试渲染原始组件

1. 首先，我们要明白的是，当子组件需要异步资源时，会**主动抛出一个特殊对象（通常是 Promise）**

   比如 如 `React.lazy`

   ```js
   function readLazyComponentType(lazyComponent) {
     const status = lazyComponent._status;
     if (status === Resolved) return lazyComponent._result; // 成功返回组件
     if (status === Rejected) throw lazyComponent._result; // 失败抛出错误
     
     // 首次渲染：抛出 Promise 触发 Suspense
     const promise = lazyComponent._init();
     throw promise; // ⭐ 关键！抛出 Promise
   }
   ```

   ```
   // ReactFiberBeginWork.js
   function updateSuspenseComponent(
     current: Fiber | null,
     workInProgress: Fiber,
     renderLanes: Lanes,
   ) {
     // ⭐ 创建新的 Suspense 上下文
     const suspenseContext: SuspenseContext = {
       visible: current !== null && current.memoizedState !== null,
       hasFallback: true,
       forceFallback: false,
     };
     
     // ⭐ 将上下文推入当前渲染栈
     pushSuspenseContext(workInProgress, suspenseContext);
     
     // ...继续渲染子组件
   }
   ```

2. 在协调过程中，React 捕获抛出的 Promise：

   ```js
   jstry {
     // 递归渲染组件树
     workLoopSync();
   } catch (thrownValue) {
     // ⭐ 核心拦截入口
     handleThrow(root, thrownValue);
   }
   ```

   

   ```js
   // ReactFiberThrow.js
   function throwException(root, fiber, value) {
     if (value !== null && typeof value === 'object' && typeof value.then === 'function') {
       // ⭐ 识别为 Promise，标记 Suspense
       const wakeable = value;
       markSuspended(fiber, wakeable); // 标记 Fiber 为挂起状态
     }
   }
   ```

3. 在render的beginWork中，  会执行 方法。

   检查子组件是否挂起， 若是挂起状态 => 触发 mountFallbackChildren

   否则正常渲染

   

4. 当 Promise 解决时，触发重新渲染：

   ```js
   // ReactFiberWorkLoop.js
   function pingSuspendedWork(fiber, wakeable) {
     // 标记 Fiber 需要重新渲染
     markRetryLane(fiber);
     
     // 将渲染任务重新加入调度队列
     scheduleWorkOnFiber(fiber, fiber.lanes);
   }
   ```

### 架构演进

### 流程

### Scheduler

### 对 React Hook 的闭包陷阱的理解？

### React.memo() 和 useMemo() 之间的主要区别：

### 对 useReducer 的理解

### setState 是同步还是异步？

### PureComponent 和 Component的区别是

### React render 方法原理？在什么时候触发？

### useEffect VS useLayoutEffect

### Fiber 结构和普通 VNode 有什么区别？

### 简述 React diff 算法过程

### 简述 React batchUpdate 机制

### 简述 React 事务机制

### 如何理解 React concurrency 并发机制

### 简述 React reconciliation 协调的过程

### React 组件渲染和更新的全过程

### 为何 React Hooks 不能放在条件或循环之内？

 Hook 的调用顺序对react来说很重要。

1. fiber.memoizedState上存储的是 hook的链表

2. currentHookIndex

   每次调用 Hook， currentHookIndex++，

例如原本的fiber.memoizedState 是这样的 

```react
function MyComponent({ showExtra }) {
  if (showExtra) {
    const [extra, setExtra] = useState(null); // Hook 1
  }
  
  const [main, setMain] = useState(0);       // Hook 2
  const [status, setStatus] = useState('idle'); // Hook 3
}
```

> 第一次渲染（showExtra = true）

```js
fiber.memoizedState = Hook1(extra) -> Hook2(main) -> Hook3(status)
```

> 第二次，当进行update， 设置为 为 showExtra  为false， 

| 调用顺序 | 实际代码位置   | React 关联的 Hook | 状态值错位               |
| :------- | :------------- | :---------------- | :----------------------- |
| 1st Hook | Hook2 (main)   | Hook1 (extra)     | main = null (应为 0)     |
| 2nd Hook | Hook3 (status) | Hook2 (main)      | status = 0 (应为 'idle') |

即  hook2 的预期应该是0，但错误的使用 extra

即 hook3 的预期应该还是idel，但错误的使用 0

⭐ 即  Hook 的调用顺序与链表顺序不一致了。

---

❓ Hook 的调用顺序与链表顺序不一致了，为什么会导致状态的读取错位？

- 对于 `useState`:
  `hook.memoizedState` = 状态值
- 对于 `useEffect`:
  `hook.memoizedState` = effect 配置对象（包含 create/destroy/deps）



示范

```react
function Component({ showExtra = true }) {
  if (showExtra) {
    const [A, setA] = useState('A'); // Hook1
  }
  
  const [B, setB] = useState('B'); // Hook2
  const [C, setC] = useState('C'); // Hook3
}

# 初始化的时候 (showExtra 为true)
fiber.memoiziedState:
	Hook1: { memoizedState: 'A' } 
    Hook2: { memoizedState: 'B' } 
    Hook3: { memoizedState: 'C' } 
```

1. 设置为showExtra为false

   1. updateWorkInProgressHook， 实际上执行的是 useState。

   2. currentHook 指向第一个【Hook1】 （创建新 Hook 对象：复制 Hook1 的状态）

      此时指向的是 memoizedState的第一个hook，故根据hook1来创建。

   3.  创建hook对象， memoizedState 为A

      根据这个A，进行的set操作。

   4. 原本等于B的值，现在变为了A。

2. 同理，effectlist （useEffect）执行的时候也会可能错误。

> 看起来react非常蠢，他才不在乎为什么会这样
>
> 但实际上
>
> 1. **机械地复制 Hook1 的状态**，因为它是链表中的第一个节点， React 没有任何机制知道他出现了问题。
>
> 2. Hooks 的设计理念
>
>    - 极简主义
>    - 函数式纯度： **相同的调用序列应该产生相同的 Hook 关联**
>
> 3. 这不是bug这是特性。
>
>    我们更倾向于提供一种可以静态检测错误的严格模式，而不是增加运行时开销



### useEffect的流程

> - **Hook 对象**通过 `next` 指针链接成链表，并挂载到 `fiber.memoizedState`。
> - **Effect 对象**通过 `hook.memoizedState` 存储在 Hook 对象中。
> - **effectList** 通过 `fiber.updateQueue.effects` 形成链表。



> ​	当 React 调用函数组件时，会执行 MyComponent的组件，此时`useState` 和 `useEffect` 是 Hook 函数，它们会在组件函数执行时被调用。 会进入我们的流程。

https://segmentfault.com/a/1190000042715424

1. 在render时（即调用组件函数时）

   遇到 useEffect时候，会生成一个hook 的对象 。

   触发对应的 dispatch

   - 创建update
   - 将update 添加进对应的hook.queue

2. 将 Effect 添加到当前 Fiber 的 updateQueue 中（环形链表)

   将创建的 Hook 的状态值（如 `useState`）

   - fiber.memoizedState 存储的是 hook
   - fiber.updateQueue 存储组件的更新队列，包括 Effect 链表

   ```js
   fiber.updateQueue.lastEffect = effect;
   
   currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
   ```

3. Hook.memoizedState 

   - 用于存储当前 Hook 的状态（如 useState 的值）

   - 不同的 hook 中，memoizedState 的含义不同

   ```js
   不同类型`hook`的`memoizedState`保存不同类型数据
   ```

   比如 useState  存储的是state。

   useRef存储的是 ref的值。

4. hook.queue

   Update[] 当前的更新队列，例如由 setState 触发的多个更新

5. 当 render-Reconciliation 时候，

   - React 会遍历 Fiber 树，重新计算每个组件的状态， 比如 hook.memoizedState的内部值。
   - 若queue.pending有更新， 合并update，计算新的`memoizedState`

### 函数组件的return关键字

> 总结

1. 函数组件本质上是一个返回虚拟 DOM 的函数，return在这里就是语法糖的行为。
2. React.createElement： 将 JSX 标签转换为一个 **虚拟 DOM 对象** （reactelement）
3. reactelement会在render阶段开始构建fiber

---

更多的拓展示范：

```js
function MyComponent() {
  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

**Babel** 会将其转换为

````jsx
function MyComponent() {
  return React.createElement(
    'div',
    null,
    React.createElement('p', null, count),
    React.createElement('button', {
      onClick: () => setCount(count + 1)
    }, 'Increment')
  );
}
````

1. React.createElement 方法

   - 将 JSX 标签转换为一个 **虚拟 DOM 对象** （即 React Element）

   React Element）是 React 对 UI 的描述

   ⭐ 作为 React 协调（Reconciliation）算法的输入

   ```js
   {
     $$typeof: Symbol.for('react.element'), // 标识这是一个 React Element
     type: 'div',
     key: null,
     ref: null,
     props: {
       children: [
         { type: 'p', props: { children: count } },
         {
           type: 'button',
           props: {
             onClick: () => setCount(count + 1),
             children: 'Increment'
           }
         }
       ]
     }
   }
   ```

2. 在内部中， **虚拟 DOM 对象如何变成 Fiber**

   在render的beginWork开始的阶段

   React 会将虚拟 DOM 对象转换为 Fiber 节点，并通过链表形式串联起来。

3. 在commit的阶段，

   1. **执行副作用（useEffect）**
       React 会遍历 Fiber 树，执行所有标记的副作用（如 `useEffect` 的回调函数）。
   2. **更新真实 DOM**
       根据 Fiber 树中的 `flags` 标记，React 会：
      - 插入新节点（`Placement`）。
      - 更新已有节点（`Update`）。
      - 删除旧节点（`Deletion`）。

   

