> ho卡颂的文章固然写的很好 但我觉得始终在很多地方是很难串起来的，故有了这篇。
>
> 我认为 卡颂 的文章或许可以作为一个抽象的字典去参考、去理解，里面相当的抽象概念，是文字方面无法覆盖到，或许读者无法理解的，故我们自身应该有足够的疑惑与较真，去提出疑问，得到答案，最终理解作者的想法与思路。
>
> 我认为这是react本身的复杂性与架构导致的，星星点点，思想落在各处，这并非是文章能够诠释的，我认为卡颂已经做的非常好了。
>
> https://juejin.cn/post/7348651815759282226





## 一 理念与进步

### 01 react的理念

1. 构建【快速响应】的大型 Web 应用程序的首选方式

2. 快速响应

   - 网络的瓶颈
     1. 无感机制， 大于一定时间给与loading
     2. Suspense
   - CPU瓶颈
     1. 时间片机制的构建

3. 介绍下浏览器的局限性

   主流浏览器刷新频率为 60Hz，即每（1000ms / 60Hz）16.6ms 浏览器刷新一次

   - 在每 16.6ms 时间内，需要完成如下工作：
     - 01 JS脚本执行
     - 02 样式布局
     - 03 样式绘制

   单线程的性能瓶颈



### 02 react15 （必须要进步的react）

使用的是 Reconciler（负责寻找dirty目标） + Renderer （负责渲染）

1.  React 15 使用递归的方式进行虚拟 DOM 的 diff，递归调用栈会一层层深入，直到处理完所有子节点，然后一层层返回。

2. Reconciler与Renderer 也是递归的。

   协调器对比一个节点 -> 渲染器更新一个节点 -> 协调器对比下一个节点 -> 渲染器更新下一个节点。
   
   【所有更新同等重要】
   
3.  而react16

    diff 过程被分解为多个小任务（每个 Fiber 节点的对比），每个任务完成后，都可以中断，让浏览器执行更高优先级的任务。



### 03 react16+的进步

- 组成
  - Scheduler 调度器
    - 功能：调度任务的优先级，高优任务优先进入Reconciler
  - Reconciler 协调器
    - 功能： 负责找出变化的组件
  - Renderer 渲染器
    - 功能：负责将变化的组件渲染到页面上
- 时间片机制（时间片的机制）
- 优先级机制（优先级的机制）





### 04 reactDom.renderDOM的流程是什么

> 在传统模式中（ReactDOM.render）是一次性同步完成的
>
> 没有时间切片或中断能力

1. 初始化阶段

   - 创建 FiberRoot（应用根节点）和 RootFiber（组件树根节点）

2. 协调阶段

   > 通过深度优先遍历构建 Fiber 树，执行 Diff 算法标记变更

   1. reconcile -> beginWork → 构建 workInProgress Fiber 树

      > reconcile:  vdom 转 fiber

   2. reconcile  -> completeWork

3. **提交阶段**



若是 协调阶段之前， 则会进行一个 调度 scheduler。



1. 为根节点初始化更新队列（updateQueue）
2. Scheduler 

   - 同步模式：立即执行 => performSyncWorkOnRoot
   - 并发模式：会通过 Scheduler 进行任务调度 => performConcurrentWorkOnRoot



### 05 react17的批处理是啥样的？ react18+的批处理怎么做的，从底层讲讲

#### react17之前

- 触发批处理的场景

  1. 应用范围：react的合成事件中的setState机制
  2. 触发条件：并且在同一个事件中，执行多了多次setState便触发。、

- 原理

  1. 一个我们称呼为事务的机制包裹。 transaction

  2. 回调时，将所有更新会放入dirtyComponent

  3. 回调结束后，同步处理队列并渲染。

  4. 源码的标志位

     ```js
     isBatchingUpdates  这个变量名称
     ```

#### react17+

- 场景

  覆盖了所有场景：事件处理、定时器与原生事件， Promise

  1. 条件：

     只要是在同一个任务单元触发了多次的更新都会

- 原理

  1. 更新会自动走入 updateQueue

     ```js
     enqueueUpdate(fiber, queue, update); // 入队
     scheduleUpdateOnFiber(fiber); // 调度更新
     ```

  2. 利用 `queueMicrotask` 延迟处理

     ```js
     function scheduleUpdateOnFiber(root, fiber, lane) {
       markRootUpdated(root, lane); // 标记待处理更新
       ensureRootIsScheduled(root); // 统一调度
     }
     
     ```

  3. 基于 `Lane` 模型的优先级合并

     ````js
     export const SyncLane = 0b0001; // 同步优先级
     export const InputContinuousLane = 0b0010; // 连续输入（如滚动）
     export const DefaultLane = 0b0100; // 默认优先级
     
     ````

- 其他

  你可以使用【flushSync】来强制更新。

- 拓展，本质上是因为

  1. **调度器**

     React 18 使用 **Lane Model**

     所有 `setState` 调用会被封装为 **更新对象（Update）**，并加入到当前任务的更新队列中

  2. **Fiber 架构**

     Fiber 架构将渲染过程拆分为小单元（Fiber Nodes），允许 React 在更新过程中暂停、恢复或中断渲染。

     **双缓冲机制**：React 使用 **双缓冲树（Current Tree & Work-In-Progress Tree）** 管理渲染状态，确保更新过程高效且可控。

  3. 延迟更新（统一调度）

     在异步回调中调用 `setState` 时，将更新操作延迟到微任务队列的末尾统一处理。

  4. 或许你可以聊一下总体的的Fiber流程的规则。

## 一 Fiber

### 01 为什么要使用Fiber？

> Fiber节点对应的是组件、DOM节点或其它React元素

1. 传统递归VDOM的“不可中断”特性导致主线程阻塞.

   - fiber为了解决这个痛点！

2. 传统递归VDOM缺乏优先级调度能力

   - Lane模型

3. 树形结构无法支持增量渲染

   Fiber本质是用链表模拟树结构。 故可以支持这种增量渲染。

   比如

   > ompleteWork阶段自底向上回溯时，传统树结构需要递归栈而Fiber只需移动指针。这个设计使React能在任意节点中断后，直接从下一个Fiber节点恢复工作



### 02 讲一下Fiber

1. 更新的标记

   - effectTag： 代表更新的DOM类型 

     react17 已经修改其名字为 flags

   - pendingProps: 下一次渲染中使用的 props

   - memoizedProps: 上一次渲染时使用的 props

   - updateQueue : 存储了多个 Update 对象

   - hook(memoizedState):

      函数组件的状态更新存储在 Hook 对象 中.

     每个 Hook 对象内部维护着自己的 queue

   - lanes 

   - childLanes （自底向上冒泡计算出来的值）

2. fiber对应的组件相关的信息

   - tag
   - key
   - elementType 
   - stateNode : 对应的真实的dom节点

3. 还有本身的数据结构

   - return
   - child
   - sibling



### 1 说下`hooks`的状态



#### 01 状态机制

1. 每一个组件实例都对应着一个Fiber， Fiber存在 memoizedState 存储hook， 以单向链表形态存储。

2. 状态更新机制如下面

   ```js
   const [count, setCount] = useState(0);
   ```

   - Hook 节点的 `memoizedState` 存储 `count` 的值（如 `0`）。
   - `setCount` 触发
   - 的更新会存入 Hook 节点的 `queue` 队列。
   - 重渲染时，React 按顺序找到对应 Hook 节点，应用更新后的状态。

#### 02 hook的执行上下文

1. React 在渲染时设置全局变量 `currentlyRenderingFiber`
2. Hook 状态存储在 Fiber 节点
3. 当触发更新时，dispatch 函数通过闭包保留对 Fiber 的引用

#### 03  **不同类型 Hook 的 `memoizedState` 存储**

1. useState、useReducer存储的都是当前状态值
2. useRef 存储的是 current的对象 （也只是为什么我们要current获取值的原因）
3. useEffect 存储的是 `[effect, deps]` 数组
4. useMemo 缓存的计算值和依赖 [cachedValue, deps]
5. useCallback 缓存的函数和依赖





## 一 他们的区别

### 1 useRef和useState底层区别

> 都是基于hook链表来实现。
>
> 但在 【存储】、【更新】、【渲染】上的行为有着区别。

#### 01 存储上

```typescript
type Hook = {
  memoizedState: any,      // 存储当前状态
  baseQueue: Update<any> | null,
  baseState: any,
  queue: UpdateQueue<any> | null,
  next: Hook | null,       // 指向下一个 Hook
};
```

1. useState

   - ` memoizedState` 存储 **状态值**（如 `count`）
   - 他会维护 queue 作为 更新队列

   故初始化的时候，他会额外的 创建 dispatch， 并返回

   ```js
   return [hook.memoizedState, dispatch];
   ```

2. **`useRef`**

   - 【memoizedState】 里他直接存储的是 目标的引用对象。
   - **无更新队列**（修改 `current` 不触发重渲染）。

   故初始化的时候，直接返回 这个ref

   ```js
   function mountRef(initialValue) {
     const hook = mountWorkInProgressHook();
     const ref = { current: initialValue };
     hook.memoizedState = ref;
     return ref;
   }
   ```

#### 02 **更新机制**

1. useState

   - 当调用目标 setState时， 创建更新对象（`update`）加入队列
   - 标记fiber， 即 scheduleUpdateOnFiber
   - 更新 `hook.memoizedState` 并触发组件渲染

   ```js
   function dispatchAction(queue, action) {
     const update = { action, next: null }; // 创建更新
     enqueueUpdate(queue, update);          // 加入队列
     scheduleUpdateOnFiber();               // 调度渲染
   }
   ```

2. useRef

   - 直接修改 `ref.current = newValue`（**同步操作**）
   - **无队列**、**无调度**、**不触发渲染**



#### 03 渲染的差异性

- **`useState`**
  在 `renderWithHooks` 阶段，React 会：
  1. 遍历 Hooks 链表，执行状态更新计算。
  2. 更新 `memoizedState` 为最新值。
  3. **触发组件重新渲染**。
- **`useRef`**
  在渲染过程中：
  1. 直接返回 `hook.memoizedState`（即同一个 ref 对象）。
  2. **不参与渲染计算**，修改 `current` 不影响输出。
  3. 组件 **不会因 ref 变化而重渲染**。



### 2 function函数组件中的useState，和 class类组件 setState有什么区别？

1. 更新上

   useState 是完全覆盖，setState为浅合并

2.  **异步批处理**

   - useState： React 18+ 默认自动批处理【useState】所有更新。

     可以 使用 -  使用 `flushSync` 强制同步

   - setState：  React 17- 仅合成事件/生命周期内批处理

     通过回调函数获取最新值：
     `this.setState({count}, callback)`

3. 源码中

   - **`useState`**：状态存储在 **Fiber 节点的 Hook 链表**中

     - 存储在hook下的queue中，使用环形链表。

   - **`setState`**：状态存储在 **类组件实例**的 `this.state` 中

     - 存储在对应Fiber的updateQueue中（单向链表）

     

   一个是 dispatchAction ， 另一个是 Component.prototype.setState

类组件的 `setState` 和函数组件的 `useState` 最终都整合到 **Fiber 更新系统**中。



### 3 useState 与 useEffect的理解

> **hook 的数据是存放在 fiber 的 memoizedState 属性的链表上的，每个 hook 对应一个节点，第一次执行 useXxx 的 hook 会走 mountXxx 的逻辑来创建 hook 链表，之后会走 updateXxx 的逻辑**



#### 01 useEffect

```js
useEffect(() => {
  console.log(count);
}, [count]); // 初始化语句
```

1. 创建 effect 对象并加入队列

   ```js
   hook.memoizedState = pushEffect(
       HookHasEffect | hookFlags, // 包含 HasEffect 标记
       create,                    // 用户传入的函数
       undefined,                 // 销毁函数（初始为空）
       nextDeps                   // 依赖数组
     );
   ```

2.  ** Commit的beforeMutation阶段 **

   调度useEffect，空闲处理

3. 异步处理

#### 02 useState 

```js
const [count, setCount] = useState(0); // 初始化语句
```

1. 初始化

   1. mountWorkInProgressHook （ 创建hook对象 ）
   2. 返回 [hook.memoizedState, dispatch]

2. `setCount` 时

   1. dispatchSetState，触发更新
      - lane。
      - 创建update， 将 update加入当前的fiber的queue
      - 调度update队列

3. ** Render的 completeWork阶段 **

   遍历当前的hook的queue时，即effectList以计算fiber.memoziState.memoizedState新状态

4. Layout 时layout时

   执行 useLayoutEffect 销毁和创建函数。

   

### 4 React.memo() 和 useMemo() 之间的主要区别：

### useEffect 与useLayoutEffect

1. **useLayoutEffect**
   - 属于React提交阶段的同步操作
2. **useEffect**
   - 通过调度器（Scheduler）放入微任务队列

### Fiber 结构和普通 VNode 有什么区别？





## 一 概念名词知识的解释


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

2. 在协调过程中，React 捕获抛出的 Promise

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

- 1. 

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



### Scheduler（React的调度）

1. 时间分片

2. lane系统

   - 用户交互 → 高优先级
   - 数据加载 → 普通优先级
   - 后台任务 → 低优先级

3. **并发渲染**

   可中断、可恢复

### 对 React Hook 的闭包陷阱的理解？

### 

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

### PureComponent 

### React render 方法原理

### 

### 简述 React batchUpdate 机制

### 简述 React 事务机制

### 如何理解 React concurrency 并发机制

### 简述 React reconciliation 协调的过程

### React 组件渲染和更新的全过程

### 为何 React Hooks 不能放在条件或循环之内？

> 要求 Hooks 在顶层调用实质是强制保证
>
> - 每次渲染的 Hook **节点数量恒定**
> - 节点顺序**严格一致**

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

### **react可执行中断渲染从底层怎么做到的**

1. **时间切片**

   eact 将渲染任务拆分为多个 **Fiber 工作单元**，通过浏览器 API（如 **`requestIdleCallback`** 或 **`MessageChannel`**）在空闲时段执行

2. **双缓存技术**

   **中断时**：保存当前处理的 Fiber 节点指针（**`workInProgress`**） 

   恢复时**：从上次中断的 Fiber 节点继续处理





###  事件优先级，更新优先级，任务优先级，调度优先级



1. 事件优先级 → 更新优先级 （  Lane ）

   - 更新Lane

2. 更新优先级（Lane） → 任务优先级

   - 在同一个根节点（root）上可能同时存在多个更新（每个更新有自己的lane）

   - React会收集所有待处理的更新，并计算下一个要处理的lane
   - React 收集所有待处理更新，选择最高优先级作为任务优先级。
   - 多个更新可能会被批量处理到同一个任务中，但任务的整体优先级由这些更新中的最高优先级决定

3. 任务优先级 → 调度优先级

   - 实现时间切片（time slicing）和任务中断（yielding）
     1.  检查是否超过当前帧的时间预算（默认5ms）
     2. 浏览器API：检查是否有等待的输入事件
     3. 检查是否在主线程阻塞太久

   





#### 事件优先级

1. 离散事件 最高级， 例如 用户的鼠标类、键盘事件
2. 连续事件， 例如 滚动事件， 鼠标移动事件
3. 其他的默认事件

#### 更新优先级

1. 使用 **Lane 模型**（位掩码）表示优先级，允许同时处理多个优先级
2. 更新优先级继承自**触发它的事件优先级**

#### 任务优先级

> 渲染任务的排序依据 → **Fiber 树协调**

1. 获取当前最高优先级的更新车道
2. Lane 转换为 Scheduler 优先级

#### 调度优先级







## React的流程与机制

### 1 请讲述下 render阶段

> 进入 performUnitWork时

#### beginWork

> 1. 将会从从rootFiber开始向下深度优先遍历，
>
>    被遍历到的每一个Fiber对象，都会使用调用beginWork 方法。会根据传入的Fiber节点创建子Fiber节点，并将这两个Fiber节点连接起来。构建出对应的Fiber树。
>
> 2. 当遍历到叶子节点（即没有子组件的组件）时就会进入“归”阶段。
>
> 递阶段是从根节点开始，向下遍历Fiber树

1. mount

   - 根据jsx上的tag属性不同创建不同的fiber节点
   - mount时刻第一次挂载才会触发的。

2. update

   - 复用前一次更新的子Fiber
   - 新建workInProgress.child (新建子Fiber)

3. diff算法

   当考虑服用时刻即会使用react的diff算法的逻辑

#### completeWork

> 1. 从叶子节点开始，向上回溯到根节点
> 2. 虽然他也是需要区分update与mount的，但我们不应该只是片面的从这两个方面考虑

1. **DOM 准备**

   - mount挂载DOM （Fiber.stateNode 的属性）
   - update比较新旧的属性，来计算出更新的属性。

2. **构建副作用链表（effectTag）** 

   在此阶段，会检查每个Fiber节点会检查自己是否有副作用（即我们在beginWork上的行为）。

   如果有，则将自己添加到全局的副作用链表中。

3. 更新subtreeFlags

   即 标记子树是否存在更新内容，这样等下次更新的时候，就直接跳过就好了。

### 2 请讲述下简述 React diff 算法过程

> 1. 只考虑同级元素
> 2.  `key 与 type 来帮忙
> 3. 假定大部分的场景为更新（二次遍历）

1. 单节点场景

   1. key相同吗？

   2. type相同吗？

      若不同，标记节点，并删除其与子节点

   3. 考虑复用

2. 多节点场景

   1. 第一轮遍历
      - newChildren[i]与OldFiber 进行比较，若能复用（同单节点场景）则考虑前进。
   2. 第二轮遍历
      - 同时遍历完
      - new先结束 -> 删
      - old先结束 -> 增
      - 都没有结束
        1. **构建 Key 到 Fiber 的映射表**
        2. 再次遍历剩下的新的children
        3. 若旧节点化，则标记移动
        4. 否则为update。
        5. 否则为删除

### 3 讲述下commit阶段

1. beforeMutation

   - 销毁ref， 销毁对应的foucus、blur逻辑
   - 调度useEffect
     - 标记： PASSIVE
     - 收集
     - 安排
   - 触发 getSnapShotBeforeUpdate （提供componentDidUpdate使用）

2. mutation

   - 遍历effectList （处理节点和副作用）

     1. placement effectTag

        - 获取 父节点
        - 获取兄弟节点
        - 考虑插入

     2. updateEffectTag

        （执行所有useLayoutEffect hook的销毁函数将会被触发）

        - 若fiber的tag为 function

          会遍历effectList，执行所有useLayoutEffect hook的销毁函数.

          此处只需处理 DOM 和 effect

        - 若fiber的tag为hostFunction

          将根据 updateQueue直接将对应的内容渲染在页面上。

     3. deleteEffectTag

        （componentWillUnmount 将会被触发）

        - 递归调用Fiber节点及其子孙Fiber节点中，从页面移除Fiber节点对应DOM节点
        - 解绑ref
        - 调度useEffect的销毁函数

3. layout

   - 调用生命周期钩子函数 与 hook
     - 函数组件
       -  调用`useLayoutEffect hook`的`回调函数`
       - 调度`useEffect`的`销毁`与`回调`函数
     - class的组件
       - componentDidMount
       - componentDidUpdate
   - 设置新的 ref
   -  切换当前 Fiber 树:root.current = finishedWork;

