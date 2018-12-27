/**
 * 这个api大概的功能是实现自动dispatch，
 * 也就是创建完action creator 不用再dispatch这一步，其实没什么用
 * https://github.com/ecmadao/Coding-Guide/blob/master/Notes/React/Redux/Redux%E5%85%A5%E5%9D%91%E8%BF%9B%E9%98%B6-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90.md
 * 上面这篇里面写的bindActionCreator例子比较清晰
 */

 //这几行比较简单
function bindActionCreator(actionCreator, dispatch) {
  return function() {
    return dispatch(actionCreator.apply(this, arguments))
  }
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass an action creator as the first argument,
 * and get a dispatch wrapped function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
export default function bindActionCreators(actionCreators, dispatch) {

  //传入参数的判断，如果传入的actionCreators是函数
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch)
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error(
      `bindActionCreators expected an object or a function, instead received ${
        actionCreators === null ? 'null' : typeof actionCreators
      }. ` +
        `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    )
  }
  //除了上面的情况，大概就是传入对象的情况
  const keys = Object.keys(actionCreators)
  //定义一个新的对象
  const boundActionCreators = {}
  //遍历传入的对象
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]//数组的值，对象的key
    const actionCreator = actionCreators[key]//对象的值

    //如果对象的值是个函数
    if (typeof actionCreator === 'function') {
      //就把值绑定成bindActionCreator
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
    }
  }
  //返回一个与原对象类似的对象，具体看文档
  return boundActionCreators
}
