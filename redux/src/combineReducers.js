import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'


//下面这几个函数都是类型检测
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || 'an action'

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

//非生产环境错误检测，太多了不想看，主要是检查是否包含多个reducer, state的字段是否和reducer的key对应
function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? 'preloadedState argument passed to createStore'
      : 'previous state received by the reducer'

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

//检查传入进来的reducer是否合法
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]

    //像传入进来的reducer中传值
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    //如果返回一个undefined，则报异常，文档中写了传入的reducer不能返回undefined
    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      )
    }

    //对传入的reducer检测，没看检测的是什么，文档里面有
    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            ActionTypes.INIT
          } or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}



/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
export default function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers)
  const finalReducers = {}
  //过滤reducer，把非function的reducer过滤掉
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    //如果是函数才绑定到finalReducers
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key]
    }
  }


  const finalReducerKeys = Object.keys(finalReducers)

  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    //生产环境下unexpectedKeyCache对象
    unexpectedKeyCache = {}
  }

  let shapeAssertionError
  try {
    //检测传入的reducer是否合法
    assertReducerShape(finalReducers)
  } catch (e) {
    shapeAssertionError = e
  }

  //返回一个方法接收state和action作为参数，也就是合成后的reducer
  //其实就是一个普通的reducer
  return function combination(state = {}, action) {

    //如果上面的检测过程中不合法，这里抛异常
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    //如果不在生产环境中，进行异常检测
    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,//处理过的reducers
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    //下面是核心代码
    let hasChanged = false
    const nextState = {}
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i]//筛选处理过后的reducers对象的key
      const reducer = finalReducers[key]//筛选处理过后的reducers对象的value，也就是内部reducer
      /**
       * 传入的state就类似普通reducer的state
       * 这里取传入的state里面对应的key的值
       * 也就是得到的是内部reducer的对应的state
       */
      const previousStateForKey = state[key]
      /**
       * 这里将内部reducer对应的state传入到reducer中
       * 返回的是新的state
       */
      const nextStateForKey = reducer(previousStateForKey, action)
      if (typeof nextStateForKey === 'undefined') {
        //这里再次校验，因为传入combineReducers的reducer不能返回undefined
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      //新的合并state
      nextState[key] = nextStateForKey
      //设置hasChanged的值，true或者false
      /**
       * 直接将返回的state和之前的state进行地址对比，说明了redux判断状态是否改变是通过对象的浅相等。
       * 在官网中，文档特意提出这是redux保障性能的关键。
       */
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    //返回新的state树
    return hasChanged ? nextState : state
  }
}
