import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

//该文件创建一个store，返回一些store的api

/**
 * enhancer 英文翻译为增强器
 * Store enhancer 是一个组合 store creator 的高阶函数，返回一个新的强化过的 store creator。
 * 这与 middleware 相似，它也允许你通过复合函数改变 store 接口。
 */
/**
 * 创建一个redux store来保存state树
 * Creates a Redux store that holds the state tree.
 * 只能使用store中的dispatch()函数来改变state
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * 你的应用中应该只有一个store，使用 combineReducers 来把多个 reducer 创建成一个根 reducer
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * 接收两个参数，分别是当前的 state 树和要处理的 action，返回新的 state 树。
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * 初始时的 state。 在同构应用中，你可以决定是否把服务端传来的 state 水合（hydrate）后传给它，或者从之前保存的用户会话中恢复一个传给它。
 * 如果你使用 combineReducers 创建 reducer，它必须是一个普通对象，与传入的 keys 保持同样的结构。
 * 否则，你可以自由传入任何 reducer 可理解的内容。
 * 这个参数具体可以见redux文档中createStore api里面有个代码示例能看明白这个参数的作用
 *
 * 主要用于前后端同构时的数据同步
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * Store enhancer 是一个组合 store creator 的高阶函数，返回一个新的强化过的 store creator。
 * 注意这里传入的并不是一个middleware，而是一个applyMiddleware，applyMiddleware才接受中间件作为参数，它也允许你通过复合函数改变 store 接口。
 * 可以实现中间件、时间旅行，持久化等，Redux 仅提供 applyMiddleware 这个 Store Enhancer
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export default function createStore(reducer, preloadedState, enhancer) {

  //下面这几个是对一些传入参数的判断不注释了
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function'
    )
  }

  //如果第二个参数是函数并且没有传第三个参数
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    //就把第二个参数赋值给第三个参数，再把第二个参数设置为空
    enhancer = preloadedState
    preloadedState = undefined
  }


  //如果enhancer存在
  if (typeof enhancer !== 'undefined') {
    //不是函数抛异常
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    //将createStore函数作为参数传入enhancer，将最早传入的reducer传入这个store enhancer
    //这里传入的preloadedState变成了[preloadedState]而不是上面的第二个参数enhancer
    return enhancer(createStore)(reducer, preloadedState)
  }


  //reducer不是函数则抛异常
  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }


  //下面这两行用于将传入的前两个保存成当前值
  let currentReducer = reducer
  let currentState = preloadedState
  //定义一个当前的订阅列表
  //然后把当前列表和nextListeners指向同一个索引，缓存功能在ensureCanMutateNextListeners函数实现
  //这里的功能 https://github.com/kenberkeley/redux-simple-tutorial/blob/master/redux-advanced-tutorial.md 这篇文章有解释
  let currentListeners = []
  let nextListeners = currentListeners

  //定义dispatch的状态
  let isDispatching = false

  //确保能改变nextListeners
  //这里是为了保存一份订阅列表快照
  function ensureCanMutateNextListeners() {
    //判断nextListeners和currentListeners是否是同一个引用
    if (nextListeners === currentListeners) {
      //如果是同一个引用的话
      //将currentListeners数组的浅拷贝赋值给nextListeners
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.
   * 读取当前应用的state树
   * @returns {any} The current state tree of your application.
   */
  function getState() {

    /**
     * reducer函数执行时不能调用getState
     * reducer已经接收state作为参数
     * 将state传下来而不是从store中获取
     *
     * reducer是一个纯函数，在reducer中调用getState或者subscribe会导致reducer变得不纯，
     * 这两个操作其实不像dispatch，一般不会导致问题但是这是一种反模式，导致reducer变得不可预期，因此这里不允许这种操作
     * https://github.com/reduxjs/redux/issues/1568
     * https://github.com/reduxjs/redux-devtools/issues/264  这里下面的回答比较清晰的解释了
     */
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  /**
   * 添加一个监听器，在每次dispatch时会被调用，state 树中的一部分可能已经变化。
   * 你可以在回调函数里调用 getState() 来拿到当前 state
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * 下面这些是文档中的内容
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   *
   * 每次调用subscribe都要使用getState获取state，而不能在开头缓存，因为几次dispatch后state已经变化了，缓存的是旧的state
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {

    //判断监听器类型，监听器必须是一个函数
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    //同上面getState()，为了防止在reducer中调用subscribe
    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }

    //正在调用subscribe标识
    let isSubscribed = true

    //缓存一份当前订阅列表，新的操作都在nextListeners上
    ensureCanMutateNextListeners()
    //将新的listener添加到缓存的订阅列表
    nextListeners.push(listener)

    //返回一个取消订阅的函数。
    return function unsubscribe() {

      //如果不在subscribed的过程中直接返回
      //该listener如果没有被订阅直接返回，这个函数会形成一个单独的闭包
      if (!isSubscribed) {
        return
      }

      //防止在reducer中调用unsubscribe
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }

      //设置状态为false
      //将闭包中的subscribed设置为false
      isSubscribed = false

      //取消订阅也要缓存一下取消之前的订阅列表
      ensureCanMutateNextListeners()
      //获取当前listener在订阅列表中的索引
      const index = nextListeners.indexOf(listener)
      //删除原订阅列表中的
      nextListeners.splice(index, 1)
    }
  }

  /**
   * 分发action，是触发action变化的唯一路径
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * 重点：dispatch会以同步的方式调用reducer函数
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {

    //传入的action必须是一个普通对象
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    //action必须有一个type
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }
    //这里结合下面的判断代码，如果在reducer中dispatch会抛出这个异常
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    /**
     * 下面这几行代码是为了防止在reducer中调用dispatch(开发者不小心的情况下)
     * 下面调用了currentReducer也就是传入的reducer，会出现循环调用
     * 具体看这篇文章https://segmentfault.com/a/1190000007398051
     * 这种操作会不会导致一个问题？就是并发调用dispatch时isDispatching变成true会报异常？（实际上不会上文也有说明）
     * 因为js是单线程，只有一个调用栈一次只能执行一个函数或者事件，reducer是同步函数，即使并发也会一个一个执行
     *
     *
     * 简单来看就是在调用reducer函数时isDispatching为true
     */
    try {
      isDispatching = true
      //执行当前reducer返回新的state并替换掉当前state
      currentState = currentReducer(currentState, action)
    } finally {
      isDispatching = false
    }

    //把最新的nextListeners赋值到currentListeners，也就是更新到currentListeners，这样缓存是不是没用了？
    //先看这篇文章https://juejin.im/post/596f79c951882549932adff2
    //dispatch时先更新下listeners，然后会自动调用列表中的listener
    //这里下面这一行赋值不是太明白
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    //返回要dispatch的action，方便链式调用
    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * 替换 store 当前用来计算 state 的 reducer。
   * 这是一个高级 API。只有在你需要实现代码分隔，而且需要立即加载一些 reducer 的时候才可能会用到它。
   * 在实现 Redux 热加载机制的时候也可能会用到。
   *
   * 传入store会使用的下一个reducer
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {

    //传入的参数必须是函数
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }


    currentReducer = nextReducer
    //调用 dispatch 函数，传入默认的 action
    dispatch({ type: ActionTypes.REPLACE })
  }

  /**
   * 这里是一个使用响应式编程用到的一般不会使用
   * 不会响应式编程，这里不解释了
   *
   *
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  /**
   * 当create store的时候
   * ，reducer会接受一个type为ActionTypes.INIT的action，
   * 使reducer返回他们默认的state，这样可以快速的形成默认的state的结构
   */
  dispatch({ type: ActionTypes.INIT })

  //返回store的几个接口
  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
