# NodeJS 事件循环(Event Loop) Part6——定时器和微任务在`Node v11`及其之后的新变化



这篇文章是继NodeJS事件循环之后的一篇比较简短的文章。在之前的系列文章中，我详细讲述了定时器(**Timers**, `setTimeout`/`setInterval`)、`setImmediate`、`process.nextTick`，**Promise**等等内容。

然而，从Node v11.0.0版本开始，`setTimeout`, `setImmediate`, `process.nextTick` 和 `Promises`的行为有了重大变化。本文将通过对比这些函数在`Node<v11.0.0` 和 `Node ≥ v11.0.0` 中的不同表现来讨论它们的变化。如果你错过了前面的系列文章，我建议你回过头去翻一翻。

### 一、现象描述
如果你分别在浏览器环境和Node中运行如下代码片段，你会得到相反的结果：

	setTimeout(() => console.log('timeout1'))
	setTimeout(() => {
		console.log('timeout2')
		Promise.resolve().then(() => {
			console.log('promise resolve')
		})
	})
	
	setTimeout(() => console.log('timeout3'))
	setTimeout(() => console.log('timeout4'))


在浏览器中，你会得到：

	timeout1
	timeout2
	promise resolve
	timeout3
	timeout4
	
然而在<11.0.0的Node版本中，你将得到如下输出：

	timeout1
	timeout2
	timeout3
	timeout4
	promise resolve
	
在Node的实现中，`process.nextTick`回调以及其它微任务回调(即`promise`回调)是在事件循环的每个节拍之间执行的(节拍之间，也就是C++/JavaScript边界跨域的时期)。因此，所有的定时器回调都会在事件循环的定时器节拍中执行，执行完后进入下一节拍前才会执行Promise回调。

然而，浏览器和Node之间的这一差异已经被讨论了有段时间了，并且在Node v11.0.0中加了个新特性(或者说修复了)使得Node的行为与浏览器一致了。也就是在`>=v11.0.0`的Node中，输出结果将与浏览器一致：

	timeout1
	timeout2
	promise resolve
	timeout3
	timeout4
	
Node中的这一改变不仅会影响`setTimeout`，同时会影响`setImmediate`。让我们分别在Node `v8`和`v12`中运行如下代码，看看输出有啥不同：


	YULINYULIN-MC0:ndb-learn yulinyulin$ nvm use v8.11.1
	Now using node v8.11.1 (npm v5.6.0)
	YULINYULIN-MC0:ndb-learn yulinyulin$ node index.js
	timeout1
	timeout2
	timeout3
	timeout4
	promise resolve

	YULINYULIN-MC0:ndb-learn yulinyulin$ nvm use v12.3.1
	Now using node v12.3.1 (npm v6.9.0)
	YULINYULIN-MC0:ndb-learn yulinyulin$ node index.js
	timeout1
	timeout2
	promise resolve
	timeout3
	timeout4

Node `v8`和 `v11`分别清晰的给出了2种不同的结果。


如果你把`Promise.resolve().then`换成`process.nextTick`，会和上述行为完全一致:

	setTimeout(() => console.log('timeout1'))
	setTimeout(() => {
	  console.log('timeout2')
	  process.nextTick(() => {
	    console.log('nextTick')
	  })
	})
	
	setTimeout(() => console.log('timeout3'))
	setTimeout(() => console.log('timeout4'))

输出结果：

	YULINYULIN-MC0:ndb-learn yulinyulin$ nvm use v8.11.1
	Now using node v8.11.1 (npm v5.6.0)
	YULINYULIN-MC0:ndb-learn yulinyulin$ node index.js
	timeout1
	timeout2
	timeout3
	timeout4
	nextTick

	YULINYULIN-MC0:ndb-learn yulinyulin$ nvm use v12.3.1
	Now using node v12.3.1 (npm v6.9.0)
	YULINYULIN-MC0:ndb-learn yulinyulin$ node index.js
	timeout1
	timeout2
	nextTick
	timeout3
	timeout4


这是因为`Promise`微任务队列在`process.nextTick`回调执行完后执行。让我们试着运行如下代码：

	setImmediate(() => console.log('setImmediate1'))
	setImmediate(() => {
	  console.log('setImmediate2')
	  process.nextTick(() => {
	    console.log('nextTick')
	  })
	})
	
	setImmediate(() => console.log('setImmediate3'))
	setImmediate(() => console.log('setImmediate4'))

Node v8和v11下的输出如下：

	YULINYULIN-MC0:ndb-learn yulinyulin$ nvm use v8.11.1
	ANow using node v8.11.1 (npm v5.6.0)
	YULINYULIN-MC0:ndb-learn yulinyulin$ node index.js
	setImmediate1
	setImmediate2
	setImmediate3
	setImmediate4
	nextTick

	YULINYULIN-MC0:ndb-learn yulinyulin$ nvm use v12.3.1
	Now using node v12.3.1 (npm v6.9.0)
	YULINYULIN-MC0:ndb-learn yulinyulin$ node index.js
	setImmediate1
	setImmediate2
	nextTick
	setImmediate3
	setImmediate4

### 二、到底发生了什么？
在Node `v11`中，`nextTick回调`和`其它微任务队列`会在`setTimeout`/`setImmediate`执行期间执行，即使`setTimeout/setImmediate`队列此时并没有清空。也就是说，`v11`之前nextTick队列和其它微任务队列（即Promise）在每个节拍之间才会被执行，而现在的情况是，在执行timers（定时器队列）和immediate（immediates队列）节拍的过程中，也会去处理nextTick队列和其它微任务队列。 

也就是说，`在Node <V11`的版本中，事件循环中**nextTick队列**和**其它微任务队列**的执行时机如下(红箭头标识)：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmn5BRibjFdDV33Ha8mQJOicTHqI93CLHsYISBPNtd4h3R8cp8C6K8P4OaibEiakrVbSytgC0iajmZNgmbg/0?wx_fmt=png)

那么在`Node >=v11`版本中，事件循环中**nextTick队列**和**其它微任务队列**的执行时机如下(绿箭头标识)：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmn5BRibjFdDV33Ha8mQJOicTHyRKHhKEVHic5hm5flnHq6RK5K6ITyYB4VODTqrVpMQt8MicHibgSKDrMA/0?wx_fmt=png)


Node这一变化使得Node中的行为与浏览器中保持一致，增强了代码的可复用性。但是这一重大的变化可能会破坏已有的NodeJS应用，尤其是那些对旧行为有强依赖的项目。因此，如果你打算升级到`Node v11`或者更高版本，你可能需要考虑一下这一细节。