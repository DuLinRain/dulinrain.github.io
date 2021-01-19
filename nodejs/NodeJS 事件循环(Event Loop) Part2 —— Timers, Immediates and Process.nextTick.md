# NodeJS 事件循环(Event Loop) Part2 —— Timers, Immediates and Process.nextTick

欢迎回到事件循环(Event Loop)文章系列，在该系列的第一部分，我讲述了NodeJS 事件循环的整体架构。在这篇博文中，我将结合代码片段详细地讨论在第一篇博文中提到的三中重要的队列。它们是timers, immediates and process.nextTick callbacks。

### 一、Next Tick Queue(nextTick队列)
让我们再看一下前一篇博文中用到的一幅图：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lrrbuM938vZbvnjxA49YIj1hmJialjDiaQVO2icQhEXR2vompRQ6spbHyA/0?wx_fmt=png)


Next Tick Queue和其它主要的队列区分开来主要是因为它**不是libuv原生提供**的，而是由Node实现的。

在进入事件循环的每个节拍(timers queue, IO events queue, immediates queue, close handlers queue 4个主队列)之前，Node检查Next Tick Queue看有没有正在排队的事件。如果队列不是空的，Node会立即开始处理该队列**直到队列为空**。然后才会进入事件循环的节拍。

> 注意：在>=Node v11中引入了一些变化，这些变化完全改变了这种行为。[了解更多](https://medium.com/@dpjayasekara/new-changes-to-timers-and-microtasks-from-node-v11-0-0-and-above-68d112743eb3)
> 

事件循环处理Next Tick Queue的方式**引入了一个新的问题**。反复的使用`process.nextTick`往Next Tick Queue中加入事件会导致I/O以及其它队列永远处于饥饿状态。我们可以用一下简单的脚本来模拟这个场景：

	const fs = require('fs');
	
	function addNextTickRecurs(count) {
	    let self = this;
	    if (self.id === undefined) {
	        self.id = 0;
	    }
	
	    if (self.id === count) return;
	
	    process.nextTick(() => {
	        console.log(`process.nextTick call ${++self.id}`);
	        addNextTickRecurs.call(self, count);
	    });
	}
	
	addNextTickRecurs(Infinity);
	setTimeout(console.log.bind(console, 'omg! setTimeout was called'), 10);
	setImmediate(console.log.bind(console, 'omg! setImmediate also was called'));
	fs.readFile(__filename, () => {
	    console.log('omg! file read complete callback was called!');
	});
	
	console.log('started');

你可以看到输出结果是nextTick回调函数的无限次执行，并且`setTimeout`, `setImmediate` 和 `fs.readFile` 回调从没被执行。

	started
	process.nextTick call 1
	process.nextTick call 2
	process.nextTick call 3
	process.nextTick call 4
	process.nextTick call 5
	process.nextTick call 6
	process.nextTick call 7
	process.nextTick call 8
	process.nextTick call 9
	process.nextTick call 10
	process.nextTick call 11
	process.nextTick call 12
	....
	
你可以试着给`addNextTickRecurs`参数传递一个有限的参数，然后你会看到`setTimeout`, `setImmediate` 和 `fs.readFile` 回调会在所以nextTick回调执行完之后才执行。

> 在Node v0.12之前，曾经有个叫做`process.maxTickDepth`的参数用于设置Next Tick Queue长度的阈值。开发者可以手动设置这个值，这样Node不会在某个时间点处理超过`maxTickDepth`长度后的事件。但是不知道为啥这个参数再Node v0.12之后被移除了。因此，新版本的Node,仅仅只是不鼓励重复添加事件到Next Tick Queue。
> 

### 二、 Timers Queue
当你使用`setTimeout`或`setInterval`添加一个定时器的时候, Node会把定时器放入定时器堆中，定时器堆是通过libuv访问的一种数据结构。 在事件循环中的Timers Queue节拍中，Node会检查定时器堆中过期的定时器并执行相应的回调函数。如果有超过一个定时器过期(设置有同样的过期时间)，他们会按照他们被设置的顺序处理。

当一个定时器被设置了一个特殊的过期时间的时候，它**不能确保**回调函数在指定的过期时间到达时被执行。定时器的回调什么时候执行取决于系统的性能(Node需要在执行回调函数之前先检查定时器是否到期，这需要花费一些CPU时间)以及Event Loop当前正在进行的任务。相反，过期时间可以保证定时器的回调不会再给定的过期时间内被触发。 我们可以用如下简短的代码片段来模拟：

	const start = process.hrtime();
	
	setTimeout(() => {
	    const end = process.hrtime(start);
	    console.log(`timeout callback executed after ${end[0]}s and ${end[1]/Math.pow(10,9)}ms`);
	}, 1000);

当程序启动后，以上代码将开始一个1000ms的定时器并且会打印需要多久才会执行callback。如果你多次运行这个程序，你会注意到每次都可能会打印出不同的耗时并且从来不会打印出

	timeout callback executed after 1s and 0ms
	
你看到的估计是这样子的：

	timeout callback executed after 1s and 0.006058353ms
	timeout callback executed after 1s and 0.004489878ms
	timeout callback executed after 1s and 0.004307132ms
	...

当`setTimeout`和`setImmediate`一起使用的时候，定时器的这种本质可能会导致一些意想不到的结果。我将在下一节解释这个问题。

### 三、 Immediates Queue
虽然Immediates Queue的行为和setTimeout类似，它也有自己的独特之处。不同于定时器无法确保它的callback何时执行(即使当定时为0的时候), Immediates Queue可以确保在事件循环中的I/O节拍之后立即被执行。可以通过`setImmediate`函数按如下方式给Immediates Queue中加入一个事件：

	setImmediate(() => {
	   console.log('Hi, this is an immediate');
	});

#### 3.1 setTimeout vs setImmediate ?
现在我们再看看博文最开始的图，你可以看到，当程序启动后，Node开始处理定时器。然后在处理完I/O之后，它进入到Immediates Queue节拍。根据这个图，我们可以很容易的推导出下面的代码的执行结果：

	setTimeout(function() {
	    console.log('setTimeout')
	}, 0);
	setImmediate(function() {
	    console.log('setImmediate')
	});
	
正如你可能猜到的，这段代码总是会先执行`setTimeout`，然后执行`setImmediate`。因为定时器回调在immediates回调之前处理。 但是这段代码的输出结果永远无法得到保证。如果你运行这段代码多次，你会得到不同的输出结果。

这是因为，给一个定时器设置过期时间0永远不能确保该定时器回调恰好在0秒后执行。因此，当事件循环开始的时候，它可能不能立即在定时器队列中看到定时器回调。然后事件循环走到I/O节拍，然后到Immediates Queue节拍，然后他会看到在Immediates Queue中有一个事件并处理它。

但是如果你看下面这段代码，我们可以保证immediate callback觉得会在定时器callback之前执行：

	const fs = require('fs');
	
	fs.readFile(__filename, () => {
	    setTimeout(() => {
	        console.log('timeout')
	    }, 0);
	    setImmediate(() => {
	        console.log('immediate')
	    })
	});

让我们来看看这段代码的执行流程：

- 开始，程序使用`fs.readFile`函数异步读取当前文件，并且提供一个callback
- 然后 Event Loop就开始了
- 一旦文件读取完毕，他会将该事件加入到I/O队列
- 由于此时没有其它的事件待处理，Node继续等待I/O事件。然后它会看到I/O队列中有一个待处理事件，然后执行它。
- 在执行callback的时候，一个定时器被加入到定时器堆中，并且一个immediate事件被加到Immediates Queue中
- 现在我们知道，此时事件循环处在I/O队列节拍，由于I/O队列中已经没有其它待处理的I/O事件，事件循环将会转入Immediates Queue节拍。在这里它看到里面有一个immediate事件，然后会执行它。
- 在下一轮事件循环中，它会看到这个定时器队列中的事件并执行它

### 四、 结论
让我们来看一下不同的节拍/队列在事件循环中是如何一起工作的，以下面这个例子为例：

	setImmediate(() => console.log('this is set immediate 1'));
	setImmediate(() => console.log('this is set immediate 2'));
	setImmediate(() => console.log('this is set immediate 3'));
	
	setTimeout(() => console.log('this is set timeout 1'), 0);
	setTimeout(() => {
	    console.log('this is set timeout 2');
	    process.nextTick(() => console.log('this is process.nextTick added inside setTimeout'));
	}, 0);
	setTimeout(() => console.log('this is set timeout 3'), 0);
	setTimeout(() => console.log('this is set timeout 4'), 0);
	setTimeout(() => console.log('this is set timeout 5'), 0);
	
	process.nextTick(() => console.log('this is process.nextTick 1'));
	process.nextTick(() => {
	    process.nextTick(console.log.bind(console, 'this is the inner next tick inside next tick'));
	});
	process.nextTick(() => console.log('this is process.nextTick 2'));
	process.nextTick(() => console.log('this is process.nextTick 3'));
	process.nextTick(() => console.log('this is process.nextTick 4'));
	
当上述脚本被执行后，下面这些事件被加入到了事件循环队列中：

- 3个immediates
- 5个定时器事件
- 5个nextTick事件

让我们看一下执行流：

1. 当事件循环开始时，他会检查到next tick队列中有5个待处理的事件，然后依次处理他们。在处理第2个nextTick事件的时候，另外一个nextTick事件被加入到了next tick队列的队尾，因此在最初的5个next tick事件处理完后再处理这个新加的next tick事件。
2. 当next tick队列处理完后，进入下一节拍——定时器队列。在执行第二个定时器事件的时候，一个新的next tick事件被加入到了next tick队列。
3. 在定时器队列中的事件执行完后，在进入I/O节拍之前，事件循环看到next tick队列中有待处理的事件(执行第二个定时器事件时加入的)，所以它会先处理这个next tick事件。
4. 由于没有I/O事件，所以事件循环会继续走到immediates节拍，并且处理immediates队列中的事件。

棒极了！如果你运行这段代码，你会得到如下输出结果：

	this is process.nextTick 1
	this is process.nextTick 2
	this is process.nextTick 3
	this is process.nextTick 4
	this is the inner next tick inside next tick
	this is set timeout 1
	this is set timeout 2
	this is set timeout 3
	this is set timeout 4
	this is set timeout 5
	this is process.nextTick added inside setTimeout
	this is set immediate 1
	this is set immediate 2
	this is set immediate 3

我们接下来会在后面的博文中讲解next tick回调和resolved promise之间的区别。