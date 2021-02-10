# 每天学一个npm包之——promise-pool
`Promise.all`是我们进行并发的常用手段，但是有时候，我们所面对的调用的目标不太能接受很大并发量，这时候直接用`promise.all`就有问题了，需要
对`Promise.all`进行调控。[@supercharge/promise-pool](https://github.com/supercharge/promise-pool)就是一个很好用的工具包。在学习`@supercharge/promise-pool`的具体实现之前，我们先来尝试自己实现一个。

我们先看一下我们面对的场景需要实现的功能：

- 可以指定最多同时并发的数量
- 确保没有空闲
- 可以指定数据集
- 可以指定针对每个数据集对应的处理函数（如调用外部接口、查询数据等）
- 可以对每个调用的返回结果进行处理
- 可以对每个调用错误结果进行处理
- 返回时还是按`Promise.all`一次全部返回。

### 思路
控制并发我们首先想到的就是用for循环， 如：


    for (let x of xxx) {
      await getSomeData()
    }

但是这样导致的结果就是所有的异步操作都是串行执行的。

所以，换个思路，是用计数器进行判断。计数器用来记录正在并发的任务数量，任务仍然采用for循环积累，积累到一定量之后进行并发，当某个任务结束后需要将它的结果(成功、失败)记录，需要对计数器进行修改，需要将其从并发任务集移除。

伪代码如下：

    for (let item of items) {
      if (activeCount > limit) {
        await startConccurency()// 发起并发
      }
      addTask()
    }

有种实现就是在`startConccurency`中使用`Promise.all`等待一批任务都完成后，再加入任务。也就是一批一批的并发。但是这样显然不符合要求，理想的情况是只要有其中一个任务结束就需要往任务列表中加入新的任务，确保每时每刻都有指定个数的任务在并发。

如何在一组任务中任意一个结束就感知到呢？就是`Promise.race`。另一个比较重要的问题是,最后一组需要使用`Promise.all`，因为我们需要得到所有任务的结果，如果最后一组也用`Promise.race`的话，则会丢失任务结果。所以简略的实现如下：

    class MyPromisePool {
      constructor () {
        this.concurrent = 10
        this.items = [];
        this.tasks = [];
        this.results = [];
        this.errors = [];
        this.errorHandle = i => i;
        this.successHandle = i => i;
        this.activeCount = 0
      }
      withConccurent(concurrent) {
        this.concurrent = concurrent;
        return this
      }
      for(items) {
        this.items = items;
        return this;
      }
      action (action) {
        this.action = action
        return this;
      }
      successHandle(successHandle) {
        this.successHandle = successHandle
      }
      errorHandle(errorHandle) {
        this.errorHandle = errorHandle
      }
      addTask (item) {
        this.activeCount = this.activeCount + 1;
        let task = this.action(item).then((res) => {
          let result = this.successHandle(res)
          this.results.push(result);
          return result
        }).catch((res) => {
          let error = this.errorHandle(res)
          this.errors.push(error);
          return error;
        }).finally(() => {
          this.tasks.splice(this.tasks.indexOf(task), 1);
          this.activeCount = this.activeCount - 1;
        });
        this.tasks.push(task)
      }
      processBatch () {
        return Promise.race(this.tasks)
      }
      async start() {
        for (let item of this.items) {
          if (this.activeCount >= this.concurrent) {
            await this.processBatch()
          }
          this.addTask(item)
        }
        await Promise.all(this.tasks);
        return {
          results: this.results,
          errors: this.errors
        }
      }
    }

可以像下面这样使用：

    let testIns = new MyPromisePool();
    await testIns.withConccurent(10).action(async (data) => {
      console.log(data)
      return await new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(data)
        }, 5000)
      })
    }).for(new Array(100).fill(1)).start()


### @supercharge/promise-pool的实现
`@supercharge/promise-pool`的实现和上面的实现基本一样，其使用方式如下：

```js
const PromisePool = require('@supercharge/promise-pool')

const users = [
  { name: 'Marcus' },
  { name: 'Norman' },
  { name: 'Christian' }
]

const { results, errors } = await PromisePool
  .withConcurrency(2)
  .for(users)
  .process(async data => { // process就是以实际发起的异步调用
    const user = await User.createIfNotExisting(data)

    return user
  })
```

默认的并发量是10。

```js
await PromisePool
  .for(users)
  .process(async data => {
    // processes 10 items in parallel by default
  })
```

还可以自定义错误处理函数：

```js
try {
  const errors = []

  const { results } = await PromisePool
    .for(users)
    .withConcurrency(4)
    .handleError(async (error, user) => {
      if (error instanceof ValidationError) {
        errors.push(error) // you must collect errors yourself
        return
      }

      if (error instanceof ThrottleError) { // Execute error handling on specific errors
        await retryUser(user)
        return
      }

      throw error // Uncaught errors will immediately stop PromisePool
    })
    .process(async data => {
      // the harder you work for something,
      // the greater you’ll feel when you achieve it
    })

  await handleCollected(errors) // this may throw

  return { results }
} catch (error) {
  await handleThrown(error)
}
```

#### 源码

    export class PromisePoolExecutor<T, R> {
      /**
      * The list of items to process.
      */
      private items: T[]

      /**
      * The number of concurrently running tasks.
      */
      private concurrency: number

      /**
      * The intermediate list of currently running tasks.
      */
      private readonly tasks: any[]

      /**
      * The list of results.
      */
      private readonly results: R[]

      /**
      * The async processing function receiving each item from the `items` array.
      */
      private handler: (item: T) => any

      /**
      * The async error handling function.
      */
      private errorHandler?: (error: Error, item: T) => void | Promise<void>

      /**
      * The list of errors.
      */
      private readonly errors: Array<PromisePoolError<T>>

      /**
      * Creates a new promise pool executer instance with a default concurrency of 10.
      */
      constructor () {
        this.tasks = []
        this.items = []
        this.errors = []
        this.results = []
        this.concurrency = 10
        this.handler = () => {}
        this.errorHandler = undefined
      }

      
      /**
      * Ensure valid inputs and throw otherwise.
      *
      * @throws
      */
      validateInputs (): void {
        if (typeof this.handler !== 'function') {
          throw new Error('The first parameter for the .process(fn) method must be a function')
        }

        if (!(typeof this.concurrency === 'number' && this.concurrency >= 1)) {
          throw new TypeError(`"concurrency" must be a number, 1 or up. Received "${this.concurrency}" (${typeof this.concurrency})`)
        }

        if (!Array.isArray(this.items)) {
          throw new TypeError(`"items" must be an array. Received ${typeof this.items}`)
        }

        if (this.errorHandler) {
          if (typeof this.errorHandler !== 'function') {
            throw new Error(`The error handler must be a function. Received ${typeof this.errorHandler}`)
          }
        }
      }

      /**
      * Starts processing the promise pool by iterating over the items
      * and running each item through the async `callback` function.
      *
      * @param {Function} callback
      *
      * @returns {Promise}
      */
      async process (): Promise<ReturnValue<T, R>> {
        for (const item of this.items) {
          if (this.hasReachedConcurrencyLimit()) {
            await this.processingSlot()
          }

          this.startProcessing(item)
        }

        return this.drained()
      }

      /**
      * Creates a deferred promise and pushes the related callback to the pending
      * queue. Returns the promise which is used to wait for the callback.
      *
      * @returns {Promise}
      */
      async processingSlot (): Promise<void> {
        return this.waitForTaskToFinish()
      }

      /**
      * Wait for one of the active tasks to finish processing.
      */
      async waitForTaskToFinish (): Promise<void> {
        await Promise.race(this.tasks)
      }

      /**
      * Create a processing function for the given `item`.
      *
      * @param {*} item
      */
      startProcessing (item: T): void {
        const task = this.createTaskFor(item)
          .then(result => {
            this.results.push(result)
            this.tasks.splice(this.tasks.indexOf(task), 1)
          })
          .catch(error => {
            this.tasks.splice(this.tasks.indexOf(task), 1)

            if (this.errorHandler) {
              return this.errorHandler(error, item)
            }

            this.errors.push(
              PromisePoolError.createFrom(error, item)
            )
          })

        this.tasks.push(task)
      }

      /**
      * Ensures a returned promise for the processing of the given `item`.
      *
      * @param item
      *
      * @returns {*}
      */
      async createTaskFor (item: T): Promise<any> {
        return this.handler(item)
      }

      /**
      * Wait for all active tasks to finish. Once all the tasks finished
      * processing, returns an object containing the results and errors.
      *
      * @returns {Object}
      */
      async drained (): Promise<ReturnValue<T, R>> {
        await this.drainActiveTasks()

        return {
          results: this.results,
          errors: this.errors
        }
      }

      /**
      * Wait for all of the active tasks to finish processing.
      */
      async drainActiveTasks (): Promise<void> {
        await Promise.all(this.tasks)
      }
    }


### 结论
`@supercharge/promise-pool`所处理的场景其实我们在实际业务中是很可能会遇到的，其核心实现方式是基于`Promise.race` + `Promise.all`实现的。
