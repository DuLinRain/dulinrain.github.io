# 详解V8对await的优化
在上一篇文章“[详解await在V8底层的实现](https://mp.weixin.qq.com/s/iqv4QHkbh62XQ8CEVS_iNg)”中，我们已经讲述了**`await`**在V8底层的实现，以及由此带来的一些性能问题。即：**await会带来额外的2个promise以及3个微任务**。

事实上，这是在**`V8 v7.2`**以及**`Node V12`**之前的实现方式。新的**`V8 v7.2`**以及**`Node 12`**之后已经针对上述问题做了优化。

在具体讨论所实现的优化之前，我们先来看看下面这段代码：

	const p = Promise.resolve();
	
	(async () => {
	  await p; console.log('after:await');
	})();
	
	p.then(() => console.log('tick:a'))
	 .then(() => console.log('tick:b'));
	 
这段代码首先创建了一个**`fullfilled`**的 **`promise p`**，并且**`await`**它的结果，同时也给它链接了**`2`**个handlers。

我们先来看看在不同Node版本下的输出结果。由于**`p`**已经**`fulfilled`**，你可能期望先输出**`after:await`**，然后再输出**`tick:a`** 和 **`tick:b`**。事实上，这是在**`Node 8`**下的输出结果：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCosvic2gsEHhwVPuerqbmic1TsIlar1tXicglNKUA17icWicDs5evMooO7lYw/0?wx_fmt=png)

尽管上述执行行为看起来很直观，但根据ECMA规范，这是不正确的。 **`Node.js 10`**实现了正确的行为，即首先执行**`then`**链接的处理程序，然后再继续执行**`async`**函数。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCoa0d3IEuFocZicREbiaGWlciaGrAPpgv5NsMWqbHtatttUuRtVEhkNYvNQ/0?wx_fmt=png)

但这种“**`正确的行为`**”可以说不是很直观，实际上对于JavaScript开发人员来说是令人惊讶的。因此，需要对它做一些解释。 在深入探讨**`promise`**和**`async function`** 的神奇世界之前，让我们先从一些基础开始。

### (宏)任务vs微任务（Tasks vs. microtasks）

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCofRufQsXWtACA0Y6AtYNvV2XorGSbgd3g7wSDSNd9wR76YUpicrGDUZw/0?wx_fmt=png)

### Async functions

### await的底层实现

###  V8对await的优化
#### 按需创建包裹promise
在前面我们已经分析了**`await`**在v8在底层的实现：不论**`await`**右边是不是一个**`promise`**, v8在底层都会创建一个**`promise`**来包裹它。对于**`await`**右边本身就是**`promise`**的场景(实际大多数场景如此)，这一行为会带来额外的**`1`**个**`promise`**以及**`2`**个微任务。所以，如果可以通过判断**`await`**右边的本身是不是**`promise`**来决定创建/不创建包裹**`promise`**，这样就能省掉这**`1`**个额外的**`promise`**以及**`2`**个微任务。

事实是，在ECMA规范中，已经有这么一个方法**`promiseResolve`**[https://tc39.es/ecma262/#sec-promise-resolve]，它只会在需要的时候才创建包裹**`promise`**。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCoNnOlOFUXgrlGbWasNI1SSlTwoRj0yE8DFAUm2aicsOxLYqzUx0IZ2Kg/0?wx_fmt=png)

这个函数只有在需要的时候才会将**`v`**用**`promise`**包裹，如果**`v`**本身就是个**`promise`**，会原封不动的返回**`v`**。考虑到大多数实际使用场景里，**`v`**都本身就是一个**`promise`**，所以这一操作会节省**`1`**个**`promise`**以及**`2`**个微任务。这一行为在**`V8 V7.2`**中已经是默认实现了。下面是针对这一点优化后的**`await`**的底层实现和运行情况：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCokX7BU7sG0Q6qzRtvuVauajz2JN5PAVObAfIgaUN5Iuoo75TN9n7s9A/0?wx_fmt=png)

让我们同样假定我们**`await`**的**`v`**是一个**`promise`**，该**`promise`** **`fulfilled`**之后会返回**`42`**。感谢**`promiseResolve`**[https://tc39.es/ecma262/#sec-promise-resolve]的魔力，现在这个**`promise`**直接引用的是**`v`**，所以这一步什么都不需要做。随后代码继续执行，创建**`throwaway`** **`promise`**，并且将一个**`PromiseReactionJob`**微任务放入到微任务队列（用于后面恢复**`async`**函数的执行），然后暂停**`async`**函数的执行，返回调用者。继续执行JS代码。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCoGmbDEdauuafcn18dtFCibicxA27h0ejnusSdASEgobIvqUKT6CicHZ5vA/0?wx_fmt=png)

这时候，执行**`p.then`**的时候会将**`tick:a`**这个**`callback`**放入到微任务队列。JS代码已经执行完。事件循环开始进入到微任务队列，执行其中的微任务，也就是之前的**`PromiseReactionJob`**。这个任务会把**`v`**的结果传递给**`throwaway`**, 并且恢复**`async`**函数的执行，返回**`42`**。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCo9fUWWa2wBCnSZhQFga20ibdBLKibUzYbgkeWhQxGTPvyRXeF2sqcicwzA/0?wx_fmt=png)

上面这一优化避免了在**`await`**右边本身就是一个**`promise`**的情况下继续创建包裹**`promise`**， 从而减少了**`1`**个**`promise`**的创建以及**`2`**个微任务。这个和**`Node 8`**中的行为很像，但是这个已经不再是一个bug了，它是一个优化，已经写入了标准。

#### 移除throwaway promise
虽然**「按需创建包裹promise」**这一优化已经减少了**`1`**个**`promise`**的创建以及**`2`**个微任务，但是V8引擎仍然需要创建一个**`throwaway promise`**，尽管它完全是V8内部的行为。事实是，**`throwaway promise`**没有什么实质的用处，他只是为了满足规范中**`performPromiseThen`** API的约束条件。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCoomQqPQDBxN50HNVR0Ont9TxnEwTFVibakNbfDIfhw0tIW9wMHElJ8gA/0?wx_fmt=png)

幸运的是，这个问题已经解决了，因为ECMA规范做了调整(https://github.com/tc39/ecma262/issues/694)。JS引擎大多数情况下都不再需要为**`await`**创建这个**`throwaway promise`**了。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edml5CkJNH0TJ8cNX8TiaBoyCoekTYKUvabRb6zS3seaSRSKEYicekiavBEibYsGGFHSVGgwfTiasOjeadaQ/0?wx_fmt=png)

>注：如果在Nodejs里使用async_hooks，V8仍然需要创建throwaway promise。这是因为before 和 after hooks 都运行在throwaway promise的上下文




### 结论
**`aysnc function`**变得更快了，这是由于做了**`2`**个优化：

- 移除了**`2`**个多余的微任务
- 移除了**`throwaway promise`**

除此之外，对开发者而言，我们还有如下建议：

- 优先使用**`async/await`**而非**`promsie`**
- 如果使用**`promise`**的化，优先使用JS引擎原生实现的**`promsie`**而非其它的**`promsie`**实现，以便获得收益——减少**`1`**个**`promise`**创建以及**`2`**个微任务。










