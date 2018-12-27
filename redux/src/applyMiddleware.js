import compose from './compose'

//这个部分读起来比较懵，这里有一篇文章先看下
//https://github.com/zp1112/blog/issues/11

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.//要应用的中间件链
 * @returns {Function} A store enhancer applying the middleware.//返回应用了中间件的store增强器
 */
export default function applyMiddleware(...middlewares) {
  //传入中间件返回一个应用了 middleware 后的 store enhancer，返回的也是一个函数
  //该函数接收createStore作为参数
  return createStore => (...args) => {
    /**
     * 在createStore文件中调用了enhancer函数，这里这个enhancer其实和原来的createStore函数类似
     * 返回值也是一个函数接收reducer作为参数
     */

    //这里先用强化过的createStore创建一个store
    const store = createStore(...args)
    let dispatch = () => {
      //在构建middleware时应用dispatch不合法，其他中间件不会应用于这个dispatch

      //如果你尝试在创建阶段结束前 dispatch 一个 action，applyMiddleware 会抛出一个错误

      //防止在中间价中调用store.dispatch，以免造成死循环
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      )
    }

    //设置一些api
    const middlewareAPI = {
      //保证每次拿到的store是最新的
      getState: store.getState,
      //这里传入的dispatch其实是下面的那个能正常使用的dispatch，也就是已经经过中间件增强过的dispatch
      dispatch: (...args) => dispatch(...args)
    }
    //遍历中间件，执行每一个中间件，将middlewareAPI作为参数传入每一个中间件
    //chain接收的是一个所用中间件返回值组成的数组
    //中间价返回的是一个next => action => return next(action)这种形式

    //将getState和dispatch传入中间件能每次都获得最新的dispatch和store，中间件中也包裹了一层闭包
    const chain = middlewares.map(middleware => middleware(middlewareAPI))
    //使用compose函数合并，compose是函数式编程中的一个概念
    /**
     * 所以next的值接收的是store.dispatch
     * compose(...chain)(store.dispatch)经过这次调用
     * dispatch变成了接收action为参数，返回要dispatch的action的函数
     */
    dispatch = compose(...chain)(store.dispatch)

    return {
      //返回本次store增强前的store的api
      //再返回一个新的dispatch api 覆盖掉原来的store.dispatch api
      //所以中间件的作用其实就是改变dispatch
      ...store,
      dispatch
    }
  }
}
