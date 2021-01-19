# 详解await在V8底层的实现
本文将讲述**`await`**在V8底层依据[ECMA-262](https://tc39.es/ecma262/#await)的实现, 下面是一个简单的异步函数**`foo`**:

	async function foo(v) {
	  const w = await v;
	  return w;
	}
	
当**`foo`**被调用的时候，V8会把**`v`**用一个**`promise`**包裹，同时会暂停异步函数**`foo`**的执行直至前面这个**`promise`**被**`resolved`**。一旦前面这个**`promise`**被**`resolved`**，**`foo`**函数恢复执行。这个**`promise`**被**`resolved`**后的值赋给**`w`**，并且**`w`**从**`foo`**中返回。

以上只是一个整体的概述，看起来并不复杂，但实际上在上述过程中，V8底层会引入**`3`**个**`promise`**和**`3`**个**微任务(microtask)**。我们将详细讲解其中的细节。

### await底层实现
首先，V8会标记**`foo`**函数为**可恢复的(resumable)**，这意味着**`foo`**函数的执行可以被暂停并且在后面某个时候(在**`await`**那个地方)被恢复。即：

	resumable function foo (v) { //标记foo为resumable
		...
	}


然后，V8会创建一个所谓的**`implicit_promise`**，这个就是你调用**`foo`**之后返回的promise。当这个promse被**`resilved`**时会得到**`w`**。即

	resumable function foo (v) { //标记foo为resumable
		implicit_promise = createPromise(); //创建implicit_promise
		...
		resolvePromise(implicit_promise, w);
	}

那么，这会儿剩下的就是整个环节中最复杂和最有趣的地方：**`await`**。

首先，传递给**`await`**的值会被一个**`promise`**包裹，即：

	resumable function foo (v) { //标记foo为resumable
		implicit_promise = createPromise(); //创建implicit_promise
		// 1. 用promise包裹v
		promise = createPromise();
		resolvePromise(promise, v);
		...
		resolvePromise(implicit_promise, w);
	}
然后，这会有handlers赋给前面这个包裹**`promise`**，以便当这个**`promise`**被**`resolved`**的时候能够恢复**`foo`**的执行。而这个过程又需要创建一个Promise——**`throwaway`**。即：

	resumable function foo (v) { //标记foo为resumable
		implicit_promise = createPromise(); //创建implicit_promise
		// 1. 用promise包裹v
		promise = createPromise();
		resolvePromise(promise, v);
		// 2. handler赋给前面这个包裹promise
		throwaway = createPromise();
		performPromiseThen(promise,
			res => resume(<foo>，res),
			err => throw(<foo>，err),
			throwaway);
		...
		resolvePromise(implicit_promise, w);
	}

最后，在前面那个过程完成后，**`foo`**函数被暂停执行，并将**`implicit_promise`**返回给调用者。一旦**步骤1**中的**`promise`**(即包裹**`promise`**)被**`fulfilled`**，**`foo`**函数会恢复执行并拿到结果**`w`**，而**`implicit_promise`**也会**`resolved`**，其值会是**`w`**。即：

	resumable function foo (v) { //标记foo为resumable
		implicit_promise = createPromise(); //创建implicit_promise
		
		// 1. 用promise包裹v
		promise = createPromise();
		resolvePromise(promise, v);
		// 2. handler赋给前面这个包裹promise
		throwaway = createPromise();
		performPromiseThen(promise,
			res => resume(<foo>，res),
			err => throw(<foo>，err),
			throwaway);
		// 3. 暂停foo执行，返回implicit_promise
		w = suspend(<foo>, implicit_promise);
		
		resolvePromise(implicit_promise, w);
	}
	
整个过程如下图所示：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCF3QTmkicnFQqkTLJAuRHYdTHXBMH0SKYoA8pSDPswJbGB80CjLmJdYlQ/0?wx_fmt=png)

简单来说，**`await`**的整个过程可以概况为：

1. 用**`promise`**包裹**`v `**—— **`v`**即**`await`**右边的内容。
2. 附加一个**`handler`**用于后面恢复异步函数的执行。
3. 暂停异步函数的执行，返回**`implicit_promise`**给调用者。

让我们接下来一步步的看一下上面的每个步骤。

假定**`await `**右边的本身就是一个promise(注意：就语法规范而言，**`await `**右边并不一定要是promise)，这个promise **`fulfilled`**之后会返回**`42`**的数值。这时，V8 会创建一个**`promise`**包裹**`await`**右边的内容并且**`resolve`** 这个创建的包裹**`promise`**。这会把这些promise链推迟到下一个事件循环执行。这是根据ECMA-262中[PromiseResolveThenableJob]()的规范实现的。

> 注：也就是说，不论**await**右边本身是不是一个promise，V8都会创建一个**promise**来包裹**await**右边的内容。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFRjsHoMhJpZNo4ugm6kIk3tfJJnFwwufkVWvan46Xl6YRlXx36qPbjg/0?wx_fmt=png)

>图上绿色从左到右第一个**`JSPromise`**就是我们假定的**`await`**右边本身就是一个promise，它**`fulfilled`**后会返回**`42`**的值。第二个**`JSPromise`**就是V8创建的一个**`promise`**包裹**`v`**。第三个**`JSPromise`**就是步骤2中创建的一个**`throwaway`** promsie，用于**`foo`**函数恢复执行。

除了创建那个包裹**`v`**的**`promise`**，V8在**步骤2**中还创建了一个所谓的**`throwaway`** promsie。它之所以叫做**`throwaway`**是因为没有任何东西曾经和它链接，它完全是V8引擎内部的。这个**`throwaway`** promsie随后被链接到前面创建的那个包裹**`v`**的**`promise`**上，并且上面附加了一些handlers用于恢复**`foo`**函数的执行。这里会有一个[PromiseResolveThenableJob](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)被加入到微任务队列。本质上，这里的**`performPromiseThen`**所做的就是[Promise.prototype.then()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then)所做的工作。最终，**`foo`**函数的执行被暂停，控制流返回到调用者。

调用者继续执行，而由于我们的代码只有**`foo`**这个函数，没其他逻辑，所以最终调用栈(事件循环的任务队列)被清空。这时，V8引擎开始执行微任务队列中的任务：之前加入到微任务队列中的[PromiseResolveThenableJob](https://tc39.es/ecma262/#sec-promiseresolvethenablejob)。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFDeLPV9TVp14ibQHnia0SsUgfbvJy62alHU6GBIDtPK4TgMH24icZrAsug/0?wx_fmt=png)

[PromiseResolveThenableJob](https://tc39.es/ecma262/#sec-promiseresolvethenablejob) 这个微任务又会把一个新的微任务 [PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 放入微任务队列，这个 [PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 微任务会把**`await`**右边内容的得到的值链接到V8创建的那个包裹**`v`**的**`promise`**上(即下图上方绿色部分第二个**`JSPromsie`**, 此时处于**`pending`**)。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFDeLPV9TVp14ibQHnia0SsUgfbvJy62alHU6GBIDtPK4TgMH24icZrAsug/0?wx_fmt=png)

因为微任务队列必须要清空之后才能回到主循环，所以V8会继续执行前面加入的微任务[PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 。[PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 执行完后，会用从**`v`**得到的值(本例这里是**`42`**) **`fulfill`** 那个包裹的**`promsie`**(即下图上方绿色部分第二个**`JSPromsie`**, 此时处于**`fulfilled`**)。

在这个[PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 执行完后，又会加入一个针对**`throwaway`** promsie的[PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 微任务到微任务队列。可以看到此时第三个**`JSPromsie`**状态是**`pending`**.

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFqHTV2nZIcXRgw20VUsnWabCB9oVF8iaTCkaJeMxEomHD50WKXeCEr1g/0?wx_fmt=png)

V8引擎会继续执行微任务队列中的微任务。当刚才的第二个[PromiseReactionJob](https://tc39.es/ecma262/#sec-promisereactionjob) 执行完后会调用我们附加的**`fulfill/reject`** handers，不论哪种都会恢复**`foo`**函数的执行，返回**`await`**的结果——**`42`**。此时微任务队列被情况，执行流回到主事件循环：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFrbdLkia49oGRhWnPWX0D8HMuBopxCrYBI8WF6SAwZ2ic3zGOkKP05e5A/0?wx_fmt=png)

### await的开销总结

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFibcRicMR0SpoiboS9zZX8pLmKVY0czbib77e67MJmYZia96QVaIEqqEzvZg/0?wx_fmt=png)

从上面的介绍我们了解到，对于每个**`await`**, V8引擎都需要创建**`2`**个**额外**的**`promise`**——包裹**`v`**的**`promsie`**(即使**`await`**右边本身是个**`promise`**，也会创建)
和**`throwaway`**，以及至少**`3`**个**微任务**。想不到就这么简单的一个**`await`**里面涉及这么多的开销。!

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmk6bQg75cPvtLyf5dJQ4zCFaSiaXrNlAMrsBeNnKExac3sicf28zyIhyFGOCmrIgg4r2MEGiaj6YEjGQ/0?wx_fmt=png)

我们来具体看一下这些开销来自哪里。上面第一行代码负责创建包裹**`promise`**。第二行立即使用**`v`**的值**`resolve`**这个包裹**`promise`**。这2行代码会导致**`1`**个额外的**`promise`**被创建以及**`2`**个**微任务**被加入到微任务队列。当**`v`**本身就是一个**`promise`**的时候，还创建一个**`promise`**包裹**`v`**是很浪费的。而在我们实际使用中，**`v`**通常本身都会是一个**`promise`**，所以这种情况下很浪费。当然，如果**`v`**本身不是一个**`promise`**的话，这里还是需要为它创建一个**`promise`**包裹它的。

这不禁提供了一种在V8中优化**`await`**的思路——根据**`v`**是否本身是**`promise`**来决定创建或不创建**`promise`**包裹**`v`**。当然除了这个包裹**`promise`**，**`throwaway`** promise本质上也是浪费的，我们将在后面的文章中详细讲解优化**`await`**的方式。





































