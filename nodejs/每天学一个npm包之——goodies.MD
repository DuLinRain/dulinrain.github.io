# 每天学一个npm包之——goodies
[@supercharge/goodies](https://github.com/supercharge/goodies)是一个npm包，提供几个帮助函数便于编写JS代码。其中主要的2个方法是`tap(value, callback)`和`upon(value, callback)`。除此之外还提供一些判断`Promise`、`async`的辅助函数。我们先来看一下这些函数的用法。

### tap(value, callback)

`tap(value, callback)`, 以`value`为参数执行`callback`, 执行完后tap返回`value`。value可以是个`Promise`，也可以是`async`函数。这种情况下，则会将其`resolve`后的结果作为参数传递给`callback`执行：

    const { tap } = require('@supercharge/goodies')

    return tap(await User.find(1), async (user) => {
      await user.subscribeToNewsletter()
    })

    // returns the user with ID 1

#### 源码
我们来看一下`tap`的源码。`tap`的参数形式可以有很多中组合，ts的实现可以看出：

    /**
    * Calls the given `callback` function with the given `value`
    * and returns `value`. It resolves the `value` before
    * passing it to the callback in case it is a Promise.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    *
    * @example
    * const user = await tap(new User({ name: 'Supercharge' }), async user => {
    *   await user.save()
    *   await user.subscribeToNewsletter()
    * })
    */
    export function tap<T> (value: Promise<T>, callback?: (value: T) => Promise<any>): Promise<T>
    export function tap<T> (value: Promise<T>, callback?: (value: T) => any): Promise<T>
    export function tap<T> (value: T, callback?: (value: T) => Promise<any>): Promise<T>
    export function tap<T> (value: T, callback?: (value: T) => any): T
    export function tap<T> (value: T, callback?: (value: T) => any): T {
      return new Goodie().tap(value, callback)
    }

从函数定义可以看出，参数有多种形式，同时也**并不是** 「传进去的`value`是啥，返回的就是啥」，如：

    export function tap<T> (value: T, callback?: (value: T) => Promise<any>): Promise<T>

这个语法下，传进去的是`T`，返回的是`Promise<T>`。这种case下调用tap需要我们`await`一下，比如从测试case中也能看到:

    expect(
      await tap([1, 2, 3], async () => {
        await Promise.resolve()
      })
    ).toEqual([1, 2, 3])
    // pass

    expect(
      tap([1, 2, 3], async () => {
        await Promise.resolve()
      })
    ).toEqual([1, 2, 3])
    // fail

tap的内部实现就是根据不同的参数执行不同的内部逻辑：

    /**
    * Handles the tap call and delegates it either to an async tap
    * handler or to a sync tap handler.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    */
    tap<T> (value: T, callback?: (value: T) => any): any {
      // 如果value是Promise
      if (this.isPromise(value)) {
        return this.tapAsync(value, callback)
      }
      // 如果callback是async
      if (this.isAsyncFunction(callback)) {
        return this.tapAsync(value, callback)
      }
      // 否则
      return this.tapSync(value, callback)
    }


对应的`tapSync` 和 `tapAsync`分别如下：

    /**
    * Calls the given `callback` function with the
    * given `value` and returns `value`.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    */
    tapSync (value: any, callback?: Function): any {
      if (!callback) {
        return value
      }

      if (this.isFunction(callback)) {
        callback(value)
      }

      return value
    }

    /**
    * Calls the given `callback` function with the given `value`
    * and returns `value`. It resolves the `value` before
    * passing it to the callback in case it is a Promise.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    */
    async tapAsync (value: any, callback?: (value: any) => Promise<any>): Promise<any> {
      if (!callback) {
        return value
      }

      if (this.isPromise(value)) {
        value = await value
      }

      if (this.isFunction(callback)) {
        await callback(value)
      }

      return value
    }

这里面没有特别的地方，不过我们可以学习一下他这里的辅助方法`isPromise`、 `isFunction`、`isAsyncFunction`的实现，这块后面单独看。

### upon(value, callback)

`upon(value, callback)`, 以`value`为参数执行`callback`, 执行完后tap返回`callback`的结果。

    const { upon } = require('@supercharge/goodies')

    return upon(await User.find(1), async (user) => {
      return user.email
    })

    // user@email.com

`upon`与`tap`的唯一差异就是`upon`返回的是`callback`的执行结果，而不是`value`。其语法如下：

    /**
    * Calls the given `callback` function with the given `value` and returns
    * the result of the callback. It resolves the `value` before passing
    * it to the callback in case it is a Promise.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    *
    * @example
    * const email = await upon(User.findById(1), async user => {
    *   return user.email
    * })
    */
    export function upon<T, R> (value: Promise<T>, callback?: (value: T) => Promise<any>): Promise<R>
    export function upon<T, R> (value: Promise<T>, callback?: (value: T) => R): Promise<R>
    export function upon<T, R> (value: T, callback?: (value: T) => Promise<R>): Promise<R>
    export function upon<T, R> (value: T, callback?: (value: T) => R): R
    export function upon<T, R> (value: T, callback?: (value: T) => R): R {
      return new Goodie().upon(value, callback)
    }

#### 源码

具体源码实现如下：

    /**
    * Calls the given `callback` function with the given `value` and returns
    * the result of the callback. It resolves the `value` before passing
    * it to the callback in case it is a Promise.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    */
    upon<T> (value: any, callback?: (value: T) => any): any {
      if (this.isPromise(value)) {
        return this.uponAsync(value, callback)
      }

      if (this.isAsyncFunction(callback)) {
        return this.uponAsync(value, callback)
      }

      return this.uponSync(value, callback)
    }

    /**
    * Calls the given `callback` function with the given `value` and returns
    * the result of the callback.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    */
    uponSync (value: any, callback?: Function): any {
      if (!callback) {
        return value
      }

      return this.isFunction(callback)
        ? callback(value)
        : value
    }

    /**
    * Calls the given `callback` function with the given `value` and returns
    * the result of the callback. It resolves the `value` before passing
    * it to the callback in case it is a Promise.
    *
    * @param {*} value
    * @param {Function} callback
    *
    * @returns {*} value
    */

    async uponAsync (value: any, callback?: Function): Promise<any> {
      if (!callback) {
        return value
      }

      if (this.isPromise(value)) {
        value = await value
      }

      return this.isFunction(callback)
        ? callback(value)
        : value
    }

和`tap`可以说大同小异。

### isFunction

`isFunction`就是用`typeof xxx === 'function'`判断的，不赘述。

    /**
    * Determine whether the given `input` is a function.
    *
    * @param {*} input
    *
    * @returns {Boolean}
    */
    isFunction (input: any): boolean {
      return typeof input === 'function'
    }

### isAsyncFunction
`isAsyncFunction`是一个辅助方法，用来判断参数是不是`async`函数, 相信大家都有自己的判断方法，如果和它的不一样的话可以借鉴一下：

    /**
    * Determine whether the given `func` is an async function.
    *
    * @param {*} input
    *
    * @returns {Boolean}
    */
    isAsyncFunction (input: any): boolean {
      return this.isFunction(input) && input.constructor.name === 'AsyncFunction'
    }

也即他是用`typeof xxx`判断是不是函数 和 `xxx.constructor.name === 'AsyncFunction'`来一起判断的。

### isPromise
`isPromise`则是判断是不是有`then`属性，并且`then`是一个函数。

    /**
    * Determine whether the given `promise` is a Promise.
    *
    * @param {*} promise
    *
    * @returns {Boolean}
    */
    isPromise (promise?: any): boolean {
      return !!promise && this.isFunction(promise.then)
    }

### 结语
好啦，过一遍`@supercharge/goodies`主要是因为它是[@supercharge/promise-pool](https://github.com/supercharge/promise-pool)依赖的包，后者主要用于控制`Promise.all`并发数量，在很多其它包中都有使用，同时在你自身的业务场景里也有可能遇到（譬如在[使用Promise Pool提高Nodejs性能](https://medium.com/better-programming/improve-your-node-js-performance-with-promise-pools-65615bee2adb)一文中所讲）。