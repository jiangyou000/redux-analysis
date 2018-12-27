/**
 * 该函数的功能：从右到左,组合参数(函数)
 * 从右到左来组合多个函数。当需要把多个 store 增强器（一般是redux中间件） 依次执行的时候，需要用到它。
 *
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * 从右到左组合单参数函数。 最右边的函数可以采用多个参数，因为它为生成的复合函数提供了签名。
 * @param {...Function} funcs The functions to compose.
 *
 * //通过组合参数函数获得的函数
 * @returns {Function} A function obtained by composing the argument functions
 *
 * //执行顺序从右到左
 * compose(f, g, h)(...args) 等同于 (...args) => f(g(h(...args)))
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {

  //如果没有传入参数就返回一个arg=>arg函数，就是function(arg){return arg}   compose()(123)会返回123
  if (funcs.length === 0) {
    return arg => arg
  }
  //如果只传入了一个参数就返回该参数
  if (funcs.length === 1) {
    return funcs[0]
  }
  /**
   * 传入多个函数的情况下
   * 1. reduce() 方法对数组中的每个元素执行一个由您提供的reducer函数(升序执行)，将其结果汇总为单个返回值。
   * 2. 从左到右依次运行(...args) => a(b(...args))这个函数,层层包裹函数
   * 3. 也就是说最后返回一个组合函数这个组合函数接收...args参数依次执行b()然后将返回结果传入a再执行
   *
   *
   * 拆解这个过程
   * 1. 初始值为func3,传入的值为func2 则返回值为(...args) => func3(func2(...args))
   * 2. 也就是说会以初始值作为最外层函数
   * 3. 上一次返回的值a为(...args) => func3(func2(...args)) ，传入的值b为func1，则返回值为(...args) => func3(func2(func1(...args)))
   * 4. 所以最后得到的结果如上面注释所说 compose(f, g, h)(...args) 等同于 (...args) => f(g(h(...args)))
   */

   //这种多层箭头函数调用的方式是一种柯里化写法
  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}
