function createThunkMiddleware(extraArgument) {
  //返回的是一个接收{ dispatch, getState }这样参数的中间件
  //返回的这个函数接收一个next参数返回一个接收action参数的函数
  //从applyMiddleware这个函数可知next是store.dispatch
  //也就是接管了store.dispatch，该函数接收一个action作为参数，这里就类似store.dispatch了
  return ({ dispatch, getState }) => next => action => {
    /**
     * 现在这个位置是接收action为函数返回action，也就是新的dispatch函数
     * 
     * 这里的这个action就是正常使用时传入的action
     * 
     * 因为redux的action需要是一个对象而不是一个函数，
     * redux-thunk的作用是可以让action写成函数的形式
     * 在下面做了判断
     * 如果是函数的话就调用这个action传入三个值，注意第三个参数extraArgument一般使用的时候没传，这里也只分析前两个
     */
    if (typeof action === 'function') {
      /**
       * 先看getState，getState传入的是store.getState,也就是调用该值能拿到state
       * 再看dispatch，调用这里的dispatch，传入的参数是一个普通的action对象
       * 在action函数内部调用dispatch会调用上面传进来的dispatch
       */
      return action(dispatch, getState, extraArgument);
    }

    /**
     * 如果action不是函数
     * 因为next传入的是原来的store.dispatch
     * 所以不是函数就直接调用原来的store.dispatch(action)来发送action
     * 因为原来的store.dispatch()返回的也是action所以这个action还会交给下一个中间件来处理
     */
    return next(action);
  };
}

//定义一个thunk变量接收调用createThunkMiddleware函数后的返回值
const thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

export default thunk;