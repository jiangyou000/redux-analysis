/**
 * 对象检测，如果是普通对象则为true
 * 什么是普通对象？通过{}（对象字面量）或者new Object()方式创建的对象
 *
 * 用来判断传给reducer的action是一个普通对象
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
export default function isPlainObject(obj) {

  //如果下面这种情况直接返回false
  if (typeof obj !== 'object' || obj === null) return false

  /**
   * 关于这里为什么这样写有下面三篇文章做了解释
   * https://stackoverflow.com/questions/51722354/the-implementation-of-isplainobject-function-in-redux
   * https://github.com/reduxjs/redux/issues/2598
   * https://github.com/reduxjs/redux/pull/2599
   *
   * 还有知乎的一篇讨论
   * https://www.zhihu.com/question/287632207
   *
   *
   * 这里有一个中文的解释
   * https://blog.csdn.net/juhaotian/article/details/79509053
   *
   * 大概来说判断是否是普通对象有多种方法，知乎文章中提到了四种，这四种方法对普通对象的定义不同
   * stackoverflow和zhihu的讨论都提到了不用循环也可以实现
   * 上面几篇都要看，才能比较好的理解这个写法
   */
  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  //普通函数的Object.getPrototypeOf是Object.prototype，其他函数的是其构造函数，不直接判断等于Object.prototype是为了处理iframe的这种边界情况
  return Object.getPrototypeOf(obj) === proto
}
