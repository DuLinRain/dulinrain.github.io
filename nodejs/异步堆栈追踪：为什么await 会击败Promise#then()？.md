# 异步堆栈追踪：为什么await 会击败Promise#then()？
对开发者而言，与直接使用`promise`相比，使用`async`和`await`不仅仅会使得代码更易于阅读，而且可以让代码在JavaScript引擎中得到更好的优化。本文所写的关于异步代码的堆栈追踪就是其中一个优化。

> Compared to using promises directly, not only can async and await make code more readable for developers — they enable some interesting optimizations in JavaScript engines, too! This write-up is about one such optimization involving stack traces for asynchronous code.

`await`和原生`promise`本质上的区别是：`await X()` 会暂停当前函数的执行，而`promise.then(X)`会把`X`放入回调链后继续执行当前函数。在堆栈追踪的场景下，这种区别是相当重要的。

> The fundamental difference between await and vanilla promises is that await X() suspends execution of the current function, while promise.then(X) continues execution of the current function after adding the X call to the callback chain. In the context of stack traces, this difference is pretty significant.

当一个`promise`链(不论是否是语法糖形式)在某个时候抛出一个错误，JavaScript引擎会显示一条错误消息以及(很有可能)一个有用的错误堆栈。作为开发者，不论是使用原生`promise`还是 `async` 和 `await`，你通常都期望有这样的效果。

> When a promise chain (desugared or not) throws an unhandled exception at any point, the JavaScript engine displays an error message and (hopefully) a useful stack trace. As a developer, you expect this regardless of whether you use vanilla promises or async and await.

### 原生Promise

考虑这样一种场景：当异步函数`b`被调用，`b`被resolve后执行函数`c`:

> Vanilla promises
> Imagine a scenario where a function c is called when a call to an asynchronous function b resolves:

	const a = () => {
	        b().then(() => c());
	};

当`a`被调用，下面的几个过程会同步进行：

- `b` 被调用，然后返回一个`promise`，这个`promise`会在未来的某个时候resolve
- `.then`回调函数(执行`c()`)被加入到回调链

在这之后，我们已经执行完函数`a`里面的所有代码。`a`永远不会被暂停，并且在`b`返回的这个异步函数在某个时候resolve的时候，这个上下文已经不存在了。想象一下如果如果`b`或者`c`抛出一个错误会发生什么？错误堆栈应该要包含`a`，因为这是`b`或`c`被调用的地方，对吧？但是这会儿我们已经没有对`a`上下文的引用了，怎么才能得到上述的堆栈呢？

> When a is called, the following happens synchronously:
> - b is called and returns a promise that will resolve at some point in the future.
> - The .then callback (which is effectively calling c()) is added to the callback chain (or, in V8 lingo: […] is added as a resolve handler).
> After that, we’re done executing the code in the body of function a. a is never suspended, and the context is gone by the time the asynchronous call to b resolves. Imagine what happens if b (or c) asynchronously throws an exception. The stack trace should include a, since that’s where b (or c) was called from, right? How is that possible now that we have no reference to a anymore?
> 

为了得到上述理想的错误堆栈，JavaScript引擎需要做一些额外的工作：在它还有机会的时候，捕获并存储`a`的堆栈信息。在V8里面，这个堆栈信息是和`b`返回的`promise`关联起来的。当promsie fullfill的时候，堆栈信息被透传，这样`c`如果需要可以用到。

而捕获这样的堆栈信息需要花时间(即降低性能)；存储这些信息需要消耗内存。

To make it work, the JavaScript engine needs to do something in addition to the above steps: it captures and stores the stack trace within a while it still has the chance. In V8, the stack trace is attached to the promise that b returns. When the promise fulfills, the stack trace is passed on so that c can use it as needed.
Capturing the stack trace takes time (i.e. degrades performance); storing these stack traces requires memory.

### async/await
下面是用 `async/await` 而非原生`promise`实现的同样的代码：
> Here’s the same program, written using async/await instead of vanilla promises:

	const a = async () => {
	        await b();
	        c();
	};

有了 `await`，即使我们在调用`await`的时候没有搜集堆栈信息，我们仍然可以重建调用链。这是因为函数`a`被暂停，等待函数`b` resolve。如果`b`抛出一个异常，堆栈信息在这种情况下可以随时建立。如果`c`抛出异常，它堆栈信息也可以建立，就和其它任意同步函数一样，因为这一切发生时，我们还在`a`的上下文中。

> With await, we can restore the call chain even if we do not collect the stack trace at the await call. This is possible because a is suspended, waiting for b to resolve. If b throws an exception, the stack trace can be reconstructed on-demand in this manner. If c throws an exception, the stack trace can be constructed just like it would be for a synchronous function, because we’re still within a when that happens.

### 建议
ECMAScript新特性看起来都"`只是语法糖`"，async/await看起来也是，但`async/await`不只是语法糖。

可以根据以下建议允许JavaScript引擎以一种性能更好、更节省内存的方式处理堆栈追踪：

- 优先使用 `async/await` 而非原生`Promise`
- 使用 `@babel/preset-env` 以避免不必要的`async/await` 转译

尽管V8暂时(2017)还没有实现这种优化，遵循上述建议可以确保在v8(或其他JavaScript引擎)实现这种优化的时候我们的代码拥有最佳的性能。

> Recommendations
> Like most ECMAScript features that are seemingly “just syntax sugar”, async/await is more than that.
> Enable JavaScript engines to handle stack traces in a more performant and memory-efficient manner by following these recommendations:
> - Prefer async/await over desugared promises.
> - Use @babel/preset-env to avoid transpiling async/await unnecessarily.
> Although V8 doesn’t implement this optimization yet, following this advice ensures optimal performance once we (or other JavaScript engines) do.

原作者：https://twitter.com/mathias