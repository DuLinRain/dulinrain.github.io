# 每天学习一个npm包——koa-convert
koa-convert包用于将<=1.x版本中的generator形式的middleware转换成2.x中promise形式的middleware。当然它也可以将promise形式的中间件转换成generator形式的中间件。

在<=1.x稳定版的koa中，koa通过<code>fn.constructor.name == 'GeneratorFunction'</code>断言来确保所有的中间件都是generator形式。

	app.use = function(fn){
	  if (!this.experimental) {
	    // es7 async functions are allowed
	    assert(fn && 'GeneratorFunction' == fn.constructor.name, 'app.use() requires a generator function');
	  }
	  debug('use %s', fn._name || fn.name || '-');
	  this.middleware.push(fn);
	  return this;
	};
	
因此，koa-convert也基于此判断某个中间件是新版的还是老版的，并对其进行相应的转换。

### 一、使用方法
koa-convert主要提供了3个API，用于新-旧中间件的互相转换，以及一个带compose方法的API。下面我们分别来看一下：

#### 1.1 convert() 方法
convert() 方法用于将旧版本的中间件转换成新版本：

	function * legacyMiddleware (next) {
	  // before
	  yield next
	  // after
	}
	modernMiddleware = convert(legacyMiddleware)
	
#### 1.2 convert.back() 方法
convert.back() 方法用于将新版本的中间件转换成旧版本：

	function modernMiddleware (ctx, next) {
	  // before
	  return next().then(() => {
	    // after
	  })
	}
	legacyMiddleware = convert(modernMiddleware)
	
#### 1.3 convert.compose() 方法
convert.compose() 方法不仅会将旧的中间件转到新的，而且还会实现compose功能，这个compose功能就是讲多个koa中间件链式成洋葱圈模式。

	composedModernMiddleware = convert.compose(legacyMiddleware, modernMiddleware)
	// or
	composedModernMiddleware = convert.compose([legacyMiddleware, modernMiddleware])
	
	
### 二、实现原理
koa-convert主要是通过co(https://www.npmjs.com/package/co)包实现generator和promise之间的相互转换的。

#### 2.1 convert() 方法实现
如同开篇所述，convert通过<code>fn.constructor.name == 'GeneratorFunction'</code>来判断传入的中间件是否是generator, 如果是则调用co进行转换:

	const co = require('co')
	const compose = require('koa-compose')
	
	module.exports = convert
	
	function convert (mw) {
	  if (typeof mw !== 'function') {
	    throw new TypeError('middleware must be a function')
	  }
	  if (mw.constructor.name !== 'GeneratorFunction') {
	    // assume it's Promise-based middleware
	    return mw
	  }
	  const converted = function (ctx, next) {
	    return co.call(ctx, mw.call(ctx, createGenerator(next)))
	  }
	  converted._name = mw._name || mw.name
	  return converted
	}
	
	function * createGenerator (next) {
	  return yield next()
	}

#### 2.2 convert.back() 实现
convert.back()则是判断如果传入的中间件不是generator则调用co将其转换成generator：

	convert.back = function (mw) {
	  if (typeof mw !== 'function') {
	    throw new TypeError('middleware must be a function')
	  }
	  if (mw.constructor.name === 'GeneratorFunction') {
	    // assume it's generator middleware
	    return mw
	  }
	  const converted = function * (next) {
	    let ctx = this
	    let called = false
	    // no need try...catch here, it's ok even `mw()` throw exception
	    yield Promise.resolve(mw(ctx, function () {
	      if (called) {
	        // guard against multiple next() calls
	        // https://github.com/koajs/compose/blob/4e3e96baf58b817d71bd44a8c0d78bb42623aa95/index.js#L36
	        return Promise.reject(new Error('next() called multiple times'))
	      }
	      called = true
	      return co.call(ctx, next)
	    }))
	  }
	  converted._name = mw._name || mw.name
	  return converted
	}
	
#### 2.3 convert.compose() 实现
convert.compose()则是先转换，然后调用compose包处理：

	// convert.compose(mw, mw, mw)
	// convert.compose([mw, mw, mw])
	convert.compose = function (arr) {
	  if (!Array.isArray(arr)) {
	    arr = Array.from(arguments)
	  }
	  return compose(arr.map(convert))
	}