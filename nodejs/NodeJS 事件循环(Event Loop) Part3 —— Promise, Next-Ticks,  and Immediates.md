# NodeJS 事件循环(Event Loop) Part3 —— Promise, Next-Ticks,  and Immediates

欢迎回到NodeJS事件循环系列,在该系列的第一篇博文中，我们讨论了NodeJS的整体概况及其不同的阶段。随后在第二篇博文中，我们讨论了定时器(timers)和immediates 在事件循环中的存在以及事件队列是如何按步骤执行的。在本文中，我们将讨论事件循环是如何处理resolved/rejected promises(包括原生Promise，Q promises, Bluebird promises) 和 next tick callbacks的。如果你还不熟悉Promise,建议你先了解它一下。相信我，会非常有趣。

### 一、 原生Promise
>注意： 在Node v11中引入了一些变化，使得`nextTick`, `Promise callbacks`, `setImmediate` 和 `setTimeout callbacks` 的执行产生了很大变化。[了解更多](https://medium.com/@dpjayasekara/new-changes-to-timers-and-microtasks-from-node-v11-0-0-and-above-68d112743eb3)
>

在原生promise环境下，promise回调被视为一个微任务，并且被入列到微任务队列，这个队列会在next tick队列执行完后被立即处理。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lrrbuM938vZbvnjxA49YIj1hmJialjDiaQVO2icQhEXR2vompRQ6spbHyA/0?wx_fmt=png)

考虑如下代码：

	Promise.resolve().then(() => console.log('promise1 resolved'));
	Promise.resolve().then(() => console.log('promise2 resolved'));
	Promise.resolve().then(() => {
	    console.log('promise3 resolved');
	    process.nextTick(() => console.log('next tick inside promise resolve handler'));
	});
	Promise.resolve().then(() => console.log('promise4 resolved'));
	Promise.resolve().then(() => console.log('promise5 resolved'));
	setImmediate(() => console.log('set immediate1'));
	setImmediate(() => console.log('set immediate2'));
	
	process.nextTick(() => console.log('next tick1'));
	process.nextTick(() => console.log('next tick2'));
	process.nextTick(() => console.log('next tick3'));
	
	setTimeout(() => console.log('set timeout'), 0);
	setImmediate(() => console.log('set immediate3'));
	setImmediate(() => console.log('set immediate4'));
	
在上面的例子中，下面的行为将会发生：

1. **5**个promise resolved callback 被加入到promise微任务队列(注意我加入了5个resolved promised回调函数)
2. **2**个处理函数被加入到了`setImmediate`队列
3. **3**个回调函数被加入到了`process.nextTick`队列
4. 创建了**1**个过期时间为0的定时器，它会立即到期并且回调被添加加到了定时器队列
5. 另外**2**个回调被再次加入到`setImmediate`队列

然后，事件循环会开始检查`process.nextTick`队列：

1. 事件循环会发现在nextTick队列中有3个待处理的事件并且Node会执行这些事件直到队列为空
2. 然后，事件循环会检查promise微任务队列，会发现里面有5个promise事件待处理，Node会执行这些事件直到队列为空
3. 在处理promise微任务队列中的promise回调的时候，一个新的事件被加入到了nextTick队列
4. 在promise微任务队列处理完之后，事件循环会再次检查到nextTick队列中有一个待处理事件(在处理promise微任务队列的时候添加的)。Node会继续处理nextTick队列。
5. 在处理完nextTick队列之后，检查promise微任务队列，此时也没有任务待处理。所以，事件循环会进入到第一个节拍(定时器队列)。此时会发现定时器队列中有一个待处理的定时器事件，然后处理它。
6. 现在定时器队列处理完后，事件循环进入下一个节拍(I/O队列)，由于没有待处理的I/O事件，事件循环继续走到下一个节拍(Immediate队列), 此时会发现有 4 个待处理的`setImmediate`事件，然后处理。
7. 最后，事件循环处理完了所有的事情，然后程序优雅的退出了。

>是不是看到很多地方用词都是“promise微任务队列” 而不是直接使用 “微任务队列”？
>
>这是因为`resolved/rejected promise` 和 `process.nextTick` 都被称为微任务队列。所以不能直接分别称为nextTick队列和微任务队列。 这是是图中，将nexttick队列标注为 next tick队列，把resolved promise标注为其它微任务队列的原因。
>

所以我们来看看上面的例子的输出结果：

	next tick1
	next tick2
	next tick3
	promise1 resolved
	promise2 resolved
	promise3 resolved
	promise4 resolved
	promise5 resolved
	next tick inside promise resolve handler
	set timeout
	set immediate1
	set immediate2
	set immediate3
	set immediate4
	
### 二、Q 和 Bluebird
我们现在知道了，原生Promise的resolved/rejected事件会放入“其它微任务队列”，并且会在事件循环进入下一个节拍之前被处理。那么非原生的Q 和 Bluebird库中的promise呢？

在NodeJS实现原生的promise之前，人们都使用诸如Q 和 Bluebird 之类的库实现promise，他们和原生的promise有着不同的语义。

在写这篇博文的时候，Q（v1.5.0） 会将resolved/rejected promise放入next tick队列(也就是用process.nextTick实现的)。 如Q的文档所说：

>请注意，promise的解析始终是异步的：也就是说，resolve或reject回调将始终在事件循环的下一轮中被调用(Node中即`process.nextTick`)，这为你在跟踪代码流时提供了一个很好的保障，即在执行任何回调之前，then肯定被return。
>

另一方面，在写这篇博文的时候，Bluebird（v3.5.0），会将resolved/rejected promise放入Immediate队列(也就是用setImmediate实现的)。

为了更好的验证这一点，我们来看另外一个例子：

	const Q = require('q');
	const BlueBird = require('bluebird');
	
	Promise.resolve().then(() => console.log('native promise resolved'));
	BlueBird.resolve().then(() => console.log('bluebird promise resolved'));
	setImmediate(() => console.log('set immediate'));
	Q.resolve().then(() => console.log('q promise resolved'));
	process.nextTick(() => console.log('next tick'));
	setTimeout(() => console.log('set timeout'), 0);
	
在上面的例子中，由于BlueBird.resolve()内部实际使用的是`setImmediate`，BlueBird.resolve().then 回调和`setImmediate`回调都会被放入Immediate队列，而由于Q内部使用的是`process.nextTick`来实现 resolve/reject callback，所以它会被放入next tick队列。因而按照事件循环节拍的顺序我们可以推导出上面代码的输出：

	q promise resolved
	next tick
	native promise resolved
	set timeout
	bluebird promise resolved
	set immediate

>注意： 虽然我在上面只使用了Promise.resolve回调，但其实Promise.resolve回调和它具有同样的行为，在文末我会展现一个同时使用resolve和reject的例子。
>

但是，Bluebird给我们提供了一些选项。我们可以选择它的执行机制。也就是说我们可以指定让Bluebird按`process.nextTick`方式执行或者按`setImmediate`执行。 Bluebird提供了叫做`setScheduler`的方法，它接收一个函数作为参数，会覆盖默认的`setImmediate`机制。

你可以按如下方式让Bluebird使用process.nextTick方式执行：

	const BlueBird = require('bluebird');
	BlueBird.setScheduler(process.nextTick);
	
并且，你也可以按如下方式使用setTimeout机制：

	const BlueBird = require('bluebird');
	BlueBird.setScheduler((fn) => {
	    setTimeout(fn, 0);
	});

>为避免本篇博文过于冗长，我不打算在这里介绍`BlueBird.setScheduler`的各种使用方法。你可以自己尝试各种方式。
>

使用`setImmediate`而不是`process.nextTick`有它的好处。由于在Node > v0.12里没有实现`process.maxTickDepth`参数，无限制的往nextTick 队列中加入事件会导致事件循环出现I/O饥饿。因此，在Node > v0.12版本中使用`setImmediate`替代`process.nextTick`有很大的优势，因为immediates queue队列会在I/O队列执行完后开始执行(如果此时nextTick队列中无待处理事件)，`setImmediate`不会导致I/O饥饿。

### 三、最后一点
如果你运行以下程序，你可能会遇到一些令人费解的输出:

	const Q = require('q');
	const BlueBird = require('bluebird');
	
	Promise.resolve().then(() => console.log('native promise resolved'));
	BlueBird.resolve().then(() => console.log('bluebird promise resolved'));
	setImmediate(() => console.log('set immediate'));
	Q.resolve().then(() => console.log('q promise resolved'));
	process.nextTick(() => console.log('next tick'));
	setTimeout(() => console.log('set timeout'), 0);
	Q.reject().catch(() => console.log('q promise rejected'));
	BlueBird.reject().catch(() => console.log('bluebird promise rejected'));
	Promise.reject().catch(() => console.log('native promise rejected'));
	
输出：

	q promise resolved
	q promise rejected
	next tick
	native promise resolved
	native promise rejected
	set timeout
	bluebird promise resolved
	bluebird promise rejected
	set immediate
	
现在你应该会有2个问题：

1. 如果Q内部使用的是`process.nextTick`来执行它的resolved/rejected promise callback, 那为什么q promise rejected会在next tick前输出？
2. 如果BlueBird内部使用的是`setImmediate`来执行它的resolved/rejected promise callback, 那为什么bluebird promise rejected会在set immediate前输出？

这是因为2个库都会把resolved/rejected promise callback放在一个数据结构中，然后分别采用`process.nextTick`和`setImmediate`来执行。

### 总结
现在你已经对`setTimeout`, `setImmediate`, `process.nextTick` 和 `promises`有了跟多了解，你应该可以清晰的解读上面的例子了。在下一篇博文中，将会详细讲述事件循环中的I/O处理。相信我，这将是一个很棒的话题！