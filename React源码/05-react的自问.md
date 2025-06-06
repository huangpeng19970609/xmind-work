> ho卡颂的文章固然写的很好 但我觉得始终在很多地方是很难串起来的，故有了这篇。
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

5. reconcile -> beginWork → 构建 workInProgress Fiber 树

   > reconcile:  vdom 转 fiber

   - 深度优先遍历构建 workInProgress 树
   - 对比新旧 Fiber（Diff 算法），打上 effectTag（插入/更新/删除）
   - 处理生命周期（如过时的 `componentWillMount`）

6. reconcile  -> completeWork → 收集 effect list

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

   以前的vdom结构，

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

1. react0至15

   - 一直都有vdom 与 diff算法

   - 也一直都有**Reconciliation** 

     不过这是 **同步协调**， **不可中断地**

   - 缺点

     1. 主线程的堵塞
     2. **无法中断**（用户的交互无法响应）
     3. 粒度还是不够细致

2. react16

   - **Fiber Reconciler**

     （详情请看问题【为什么要Fiber】）

3. React16.8

   - Hooks

4. React 18.x

   - 并发渲染(**Concurrent Mode**)
     1. 通过 `ReactDOM.createRoot` 创建根节点来启用并发渲染能力
     2. **可中断渲染**
     3. **时间切片 (Time Slicing)**



### useState 与 useEffect的理解

> **hook 的数据是存放在 fiber 的 memoizedState 属性的链表上的，每个 hook 对应一个节点，第一次执行 useXxx 的 hook 会走 mountXxx 的逻辑来创建 hook 链表，之后会走 updateXxx 的逻辑**



#### 前言



> 当我们开始进行debugger的操作，

1. 当前的fiber节点，可以找到对应的 useState、useRef、useEffect？

   即 fiber.memoziedState 

   - memoziedState里的数据 通过 next进行连接。

     根据 不同的类型存储不同的数据 （）

     ````js
     # useState这个hook
     memoziedState: 111
     baseState: 111
     next: useRef对应的hook
     
     #useRef
     baseState: null
     memoziedState: { current:　１ }
     
     #useEffect
     tag: 9,
     memoziedState: effect
     ````

2. 何时构建了useRef?

   内部的useRef实现

   ````js
   useRef: function( initialValue ) {
       currentHookNameInDev: 'useRef',
       
       mountHookTypesDev();
       
       return mountRef(initialValue);
   }
   ````

   触发对应ref方法

   ````js
   # 若是挂载
   function mountRef(initialValue) {
       
       var hook = mountWorkInProgressHook();
       
       const ref2 = {
           current: initialValue
       }
       
       hook.memoizedState = ref2
       
       return ref2
       
   }
   
   # 若是update （第二次调用）
   function updateRef() {
        var hook = updateWorkInProgressHook();
       
        return hook.memoizedState;
   }
   ````

   继续 构建hook方法

   ```js
   function mountWorkInProgressHook() {
       
       var hook = {
           memoziedState: null,
           baseState: null,
           baseQueue: null,
           queue: null,
           next: null,
       }
       
       if ( workInprogressWork === null ) {
           currentLyRenderingFiber$1.memoziedState = workInProgressHook = hook
       }
       // 
       else {
           workInProgressHook = workInProgressHook.next = hook
       }
   }
   ```

3. 注意：

   - 第二次调用useRef的时刻，出发useRef，便是处罚updateRef， 此时会尝试复用hook，并且直接返回hook.memorizedState的值。故， useRef返回的值，永远都是我们初始化的那个。

4. 关于useCallback、useMemo 的实现

   也是类似如此，

   - useMemo  也分为了 mountMemo 与 updateMemo 两个阶段

     mountMemo 时， 

     ```jsx
     hook.memoizedState = [ nextValue, nextDeps ]
     ```

     而updateMemo时

     会判断依赖有没有变化，若是变化更新，否则直接返回

5. 

#### useEffect

他们如果按照划分也是分为两个阶段不同的划分 

- mountEffect
  1. mountEffect 会 触发一个pushEffect方法
- updateEffect
  1. updateEffect也会 触发一个pushEffect方法



1. pushEffect
   - 里面创建了 effect 对象并把它放到了 fiber.updateQueue 上
2. commit 最开始的时候，异步处理的 effect 列表 （fiber.updateQueue）
   - 注意，是在commit之前的阶段开始执行 （异步执行不阻塞渲染）
   - 遍历完一遍 fiber 树，处理完每个 fiber.updateQueue 就处理完了所有的 useEffect 的回调
   - useLayoutEffect 会导致同步的堵塞，这是因为他在commit的阶段执行调用方法。



#### useState 

同样的分为两个阶段

- mountState 

  1. 同样的，将初始的数据  initailState 到 fiber.memoized

  2. 同样的， 创建queue，hook.queue 现在出现了。

     并返回dispatch， 这个dispatch函数绑定了 当前的fiber 与 queue，目的是提供用户来触发。

     即 setXXX， 即 dispatch

- updateState 

  1. 调用updateReducer

     自然也是根据优先级，这里会根据 lane 来比较，然后做 state 的合并，最后返回一个新的 state

  2. 

### useMemo

https://zhuanlan.zhihu.com/p/608959809

对于 useMemo， 它是当依赖不变的时候始终返回之前创建的对象，当依赖变了才重新创建

- 即 deps变化的时候， 重新创建，

- 故一般是用在 props 上，因为组件只要 props 变了就会重新渲染，用 useMemo 可以避免没必要的 props 变化。达到性能优化的作用

1. mountMemo 

   ````jsx
function mountMemo() {
       
   }
   ````
   
   

2. updateMemo 



### Scheduler

### 对 React Hook 的闭包陷阱的理解？

### React.memo() 和 useMemo() 之间的主要区别：

### 对 useReducer 的理解

### setState 是同步还是异步？

> 总的来说，react认为你这些任务并不是react管控内的任务了，
>
> 故不再按照react的调度遵循，而是尊重你的选择，关闭react的调度规则。

1. 在 React 的**合成事件**与**生命周期方法**是异步的
   - 处理策略为 batching 模式， 会进行合并处理，只会渲染一次。
   - 直接访问state是不能获取到最新的值的。
2. 在 **`setTimeout`、`setInterval`、原生 DOM 事件** 或 **`Promise` 回调** 中，`setState` 会同步执行。（脱离 React 调度控制）
3. **异步执行**：默认通过 `MessageChannel` 或 `setImmediate` 实现微任务调度

#### 01 react18+的优化

1. `ReactDOM.createRoot` 启用并发模式后，**所有更新默认批处理**
   - 使用 `flushSync` 强制同步更新

#### 02 批处理 与 **同步行为触发条件**

1. 但源码的内部，

   开头：会对于 生命周期方法 与 合成事件，进行批处理的标记。

   过程：所有 `setState` 调用会被收集到更新队列中而不立即执行。

   结束：事件回调结束后，React 一次性处理所有更新

   即 fiber.updateQueue

2. 若是 【**原生事件**】、【**异步代码**】

   React 会**同步刷新更新队列**

3. react18的优化

   提供了这个设置可以强制【`flushSync` 】

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

   

### useTransition

```tsx
const [ isPendging, startTransition ] = useTransition();
```



- 介绍一个卡顿情况

  首先单纯的使用 input的onchange方法来触发对应的 setState操作，进行大量的dom插入

  1. setState本质上是触发了 dispatchSetState这个方法。

     ⭐ 入口处存在，

     ````js
     # 获取一个31位的二进制掩码
     lane = requestUpdateLane(fiber);
     ````

     其中，我们这个用户操作的优先级是最高的，这是一个同步的优先级。并且是无法被中断的。

     故这类操作必然会堵塞主线程。

  2. performance存在一个长的longTask无法被中断

- 在使用useTransition不卡顿了

  1. longTask消失了， 被分割多了task任务。

  2. 触发startTransition时，

     - 触发 setCurrentUpdateProprity 暂时性的拔高当前的优先级。这让setPendging及时的立刻执行，
     - ⭐ 他会修改 【ReactCurrentLane】，将lane修改为transitionLane，从而不是那么高的优先级了，故可以开启并发模式。
     - 注此处有 preRansition 防止用户在useTransition再度使用 useTransition

  3. 当requestUpdateLane时，

     ReactCurrentLane变量的判断的修正（我们已经在先前的操作修改了当前的lane了）

  4. 故现在，当进行workSync时，shouldYield的判断可以进入并发模式的判断中了。

     会处理构建当前fiber节点后，判断是否超时，若是超时，则暂停，则调用Scheduler调度下一次的执行，保证不卡顿。

     这也就是为什么 会出现一系列task的原因。