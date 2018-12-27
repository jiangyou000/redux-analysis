function compose(...funcs) {
  console.log(funcs)
  if (funcs.length === 0) {
    return arg => arg
  }
  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

function func1(num) {
  console.log('func1 获得参数 ' + num);
  return num + 1;
}

function func2(num) {
  console.log('func2 获得参数 ' + num);
  return num + 2;
}

function func3(num) {
  console.log('func3 获得参数 ' + num);
  return num + 3;
}

let result = compose(func3, func2, func1)(0)
console.log(result)
