# 每天学一个npm包——koa-compose
<a href="https://www.npmjs.com/package/koa-compose">koa-compose</a>用于将koa的多个中间件组合起来，实现洋葱圈模式的调用。

### 一、 compose 原理

我们都知道，koa中间件的语法如下：

	const middleware = async function (ctx, next) => {
	  //do something
	  await next();
	  //do otherthing
	}
	
我们使用中间件的时候只需要按如下方式：

	app.use(middleware)
	
实际上，调用app.use的时候，koa其实把middleware放进了一个数组中，在创建完context后使用compose方法(<code>compose([a, b, c, ...])</code>)将所有中间件组合起来，它的整个流程如下：

![洋葱圈模式实现](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmnXs5QOVb2UibGYOvO25X5dQE5srpUZK19DWHTfg0xJ8kOzEdiaiboicFwDqFk98EsStlgU6N09StkOVw/0?wx_fmt=png '洋葱圈模式实现')

### 二、compose 实现
compose的实现如下：

	/**
	 * Compose `middleware` returning
	 * a fully valid middleware comprised
	 * of all those which are passed.
	 *
	 * @param {Array} middleware
	 * @return {Function}
	 * @api public
	 */
	
	function compose (middleware) {
	  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
	  for (const fn of middleware) {
	    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
	  }
	
	  /**
	   * @param {Object} context
	   * @return {Promise}
	   * @api public
	   */
	
	  return function (context, next) {
	    // last called middleware #
	    let index = -1
	    return dispatch(0)
	    function dispatch (i) {
	      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
	      index = i
	      let fn = middleware[i]
	      if (i === middleware.length) fn = next//如果是最后一个中间件
	      if (!fn) return Promise.resolve()
	      try {
	        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)));
	      } catch (err) {
	        return Promise.reject(err)
	      }
	    }
	  }
	}
	
该方法执行后返回的是一个新的中间件，这个中间件会链式调用后续的所有中间件。




