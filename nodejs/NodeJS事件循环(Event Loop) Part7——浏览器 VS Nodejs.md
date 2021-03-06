# NodeJS事件循环(Event Loop) Part7—浏览器 VS Nodejs

事件循环对于新人来说是个非常令人困惑的主题并且通常不是百分之百理解。更令人困惑的是，你经常会遇到2个比较流行的词：“NodeJS Event Loop” 和 “JavaScript Event Loop”。前者顾名思义，后者则是指运行在浏览器中的事件循环。既然有这2个区分，那么就会引申出如下问题：

- 这2个东西是一样的吗？还是说只是有些相似？亦或是完全不同？
- 如果不同的话，不同点在哪里？
- 如果相同的话，为什么我们要区分“NodeJS Event Loop” 和 “JavaScript Event Loop”？
简单说的话，是的，他们的某些行为很相似。另一方面，它们又在有些方面有所不同。因此，在这篇文章中，我将使用一些例子来讨论它们的不同之处，并借此帮你理清一些令你困扰的问题。

本文是事件循环系列文章中的其中一篇，为了让你能够理解或者回顾更多NodeJS Event Loop相关的知识，你可以点击下面的链接：

- [NodeJS 事件循环(Event Loop) Part1 —— 总体概况](https://mp.weixin.qq.com/s/Z-QKh58i0f6PYV6Hh0z0_w)
- [NodeJS 事件循环(Event Loop) Part2 —— Timers, Immediates and Process.nextTick](https://mp.weixin.qq.com/s/fWryVuZkMtgpHlwmxXmbSg)
- [NodeJS 事件循环(Event Loop) Part3 —— Promise, Next-Ticks, and Immediates](https://mp.weixin.qq.com/s/Afk4RbN-1bj2I1siJ_ffjQ)
- [NodeJS 事件循环(Event Loop) Part4 —— Handling I/O](https://mp.weixin.qq.com/s/GMJeQbPx8ZJfoeM_Ifq6LA)
- [NodeJS 事件循环(Event Loop) Part5——最佳实践](https://mp.weixin.qq.com/s/trRtaEkf_g8qQ8QjK3JftQ)
- [NodeJS 事件循环(Event Loop) Part6——定时器和微任务在Node v11及其之后的新变化](https://dulinrain.github.io/nodejs/NodeJS事件循环(Event%20Loop)%20Part6——定时器和微任务在Node%20v11及其之后的新变化.html)


### 到底什么是Event Loop？
“Event Loop”这个词表示的是一种程序运行模式。它描述了一个简单的循环，在循环中会遍历已完成的事件结果然后处理对应的回调。JavaScript/NodeJS 事件循环没有差异。

当JavaScript应用跑起来的时候，会发出很多事件，这些事件会导致相应的事件处理器被放入到队列中等待处理。事件循环持续的监听这些事件处理器并进行处理。

#### HTML5规范中的“Event Loop”
[HTML5标准](https://html.spec.whatwg.org/)描述了一系列的标准集用来指引开发浏览器/JavaScript运行时以及其它的库。它里面也描述了实现[事件循环模型](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)的指引，以及其它可能与事件循环有关的内容，比如[定时器](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)。


大多数浏览器和JS运行时都会倾向于按照这些指引来实现从而更好的兼容web世界。但是，也会有一些场景的实现会与指引有细微的偏差，从而导致各种有趣（以及令人困惑）的现象。

在这篇文章当中，我将讨论一些这样的案例，特别是NodeJS 和 Browser 对比的案例。我将不会深入到某个浏览器内部的具体实现细节因为这些可能随时会改变。

#### Client-side vs Server-Side JavaScript
多年前，JavaScript都只能用于运行在浏览器上的客户端应用。使用NodeJS, JavaScript也可以用来开发服务端应用。虽然在客户端和服务端，他们都是同一种语言，但是客户端和服务端有着不同的需求。

浏览器是一个沙盒环境，浏览器中的JavaScript的自由度有限，无法做某些服务端JavaScript可以做的事情，比如文件系统操作，特定的网络操作等等。这需要服务端事件循环满足这些额外的需求。

浏览器和NodeJS都实现了异步事件驱动模式。然而，“事件”在浏览器环境下是用户与页面的交互（比如点击、鼠标移动、键盘等），但是在NodeJS环境里，事件是异步的服务端操作（如文件I/O，网络I/O等）。基于不同的需求，虽然浏览器（Chrome）和NodeJS使用同样的V8引擎来运行JavaScript，但是浏览器（Chrome）和NodeJS有着不同的事件循环（Event Loop）实现。

由于“事件循环”只是个程序运行模式，V8支持可插拔的方式接入外部的事件循环实现。所以Chrome使用的是[libevent](https://libevent.org/)作为事件循环的实现，而NodeJs使用的是[libuv](https://libuv.org/)作为事件循环的实现。因此，Chrome的事件循环和NodeJS的事件循环是基于不同的库的实现，所以会有一定的差异，但是他们都是用类似的“事件循环”编程模式。


### 浏览器 VS Node，差别在哪里？

#### 微任务 vs 宏任务差异

> **什么是微任务和宏任务**？简单来说，宏任务和微任务是2种异步任务类型。然而微任务较宏任务有更高的优先级。微任务的一个例子是`promise`回调。而`setTimeout`回调则是宏任务的一个例子。

浏览器和Node之间一个值得注意的差异是宏任务和微任务的优先级。虽然在NodeJS`>=v11.0.0`版本已经与浏览器的行为进行了对齐，但是在`<v11.0.0`版本下，NodeJS与浏览器的实现有较大差异。

是时候来尝试一下了! 考虑下面的例子。在这个例子中，我们将调度一系列的promise callback（微任务）和定时器callback（宏任务）来理解每种JavaScript运行时时如何执行它的。

	Promise.resolve().then(()=>console.log('promise1 resolved'));
	Promise.resolve().then(()=>console.log('promise2 resolved'));
	setTimeout(()=>{
	    console.log('set timeout3')
	    Promise.resolve().then(()=>console.log('inner promise3 resolved'));
	},0);
	setTimeout(()=>console.log('set timeout1'),0);
	setTimeout(()=>console.log('set timeout2'),0);
	Promise.resolve().then(()=>console.log('promise4 resolved'));
	Promise.resolve().then(()=>{
	    console.log('promise5 resolved')
	    Promise.resolve().then(()=>console.log('inner promise6 resolved'));
	});
	Promise.resolve().then(()=>console.log('promise7 resolved'));

> 你也可以在浏览器和Node中使用`queueMicrotask`来调度微任务，但是就这个例子而言，我将使用`Promise`回调，因为`queueMicrotask`只在`Node >=v11.0.0`中可用。


如果分别在`Nodev10.19.0`, `Nodev11.0.0`, `Chrome84`, `Firefox78` 和 `Safari13.0.5`中运行上面的代码，你将会获得如下结果：

![](https://github.com/DuLinRain/pictures/blob/master/event_loop_part7/event_loop_part7_1.png?raw=true)

如你所见，在`Nodev11.0.0`以及其它浏览器中输出的结果相同，但是在`Nodev10.19.0`中的结果却不同。这是为什么呢？

![](https://github.com/DuLinRain/pictures/blob/master/event_loop_part7/event_loop_part7_2.png?raw=true)

根据HTML5规范中关于事件循环的指导，事件循环应当在每处理完宏任务中的一个任务后将整个微任务队列中的任务处理完。在我们的例子中，当`set timeout3`回调被执行，它又调度了一个`promise callback`。按照HTML5规范，在进入定时器队列中下一个定时器回调之前，事件循环必须确保微任务队列被清空。因此，它必须执行新加入的`promise callback`，执行后会输出`inner promise3 resolved`。在处理完这个之后，微任务队列被清空了，事件循环可以继续处理定时器队列中剩余的`set timeout1` 和 `set timeout2`回调。

但是在`NodeJS<=v11.0.0`版本中，微任务队列只在事件循环2个节拍之间才会被清空。因此，`inner promise3` 回调只有在`set timeout3`, `set timeout1`和 `set timeout2`回调都被执行完之后才有机会执行。然后事件循环尝试进入到下一个节拍（I/O callback队列，虽然本例中没有）。

#### 嵌套定时器的行为
定时器的行为在NodeJS和浏览器中以及不同浏览器的品牌和版本中都有所不同。2个比较有意思的事实是0延时的定时器（注意0延时并不是真正的0延时，只是立刻把它加入到定时器队列**）** 和 **嵌套定时器**。

> 技巧：你可以通过显式地指定超时为0或者省略超时参数来创建0延时的定时器。

作为一个用来理解这2种行为的实验，我们在Node `v10.19.0`, Node `v11.0.0`, Chrome, Firefox 和 Safari中运行如下代码。这个代码片段会调度8个**嵌套的0延时定时器**，我们将会计算每个回调需要花费多久被调用。


	conststartHrTime=()=>{
	if(typeofwindow !== 'undefined')returnperformance.now();
	    returnprocess.hrtime();
	}
	
	constgetHrTimeDiff=(start)=>{
	if(typeofwindow !== 'undefined')returnperformance.now()-start;
	    const[ts,tns]=(process.hrtime(start));
	    returnts * 1e3+tns / 1e6;
	}
	
	console.log('start')
	conststart1=startHrTime();
	constouterTimer=setTimeout(()=>{
	    conststart2=startHrTime();
	    console.log(`timer1: ${getHrTimeDiff(start1)}`)
	    setTimeout(()=>{
	        conststart3=startHrTime();
	        console.log(`timer2: ${getHrTimeDiff(start2)}`)
	        setTimeout(()=>{
	            conststart4=startHrTime();
	            console.log(`timer3: ${getHrTimeDiff(start3)}`)
	            setTimeout(()=>{
	                conststart5=startHrTime();
	                console.log(`timer4: ${getHrTimeDiff(start4)}`)
	                setTimeout(()=>{
	                    conststart6=startHrTime();
	                    console.log(`timer5: ${getHrTimeDiff(start5)}`)
	                    setTimeout(()=>{
	                        conststart7=startHrTime();
	                        console.log(`timer6: ${getHrTimeDiff(start6)}`)
	                        setTimeout(()=>{
	                            conststart8=startHrTime();
	                            console.log(`timer7: ${getHrTimeDiff(start7)}`)
	                            setTimeout(()=>{
	                                console.log(`timer8: ${getHrTimeDiff(start8)}`)
	                            })
	                        })
	                    })
	                })
	            })
	        })
	    })
	})

下面则是输出结果：

![](https://github.com/DuLinRain/pictures/blob/master/event_loop_part7/event_loop_part7_3.png?raw=true)


> 重要！为了计算的更精确，我们分别在浏览器中使用了`performance.now()`和NodeJs中`process.hrtime`高精度的计时。并且保留了小数点后2位。并且这个实际在每次运行并不是100%固定的，而且是有可能比这个高的，这取决于CPU的繁忙程度。

从实验结果可能得出一些重要的观测：

- 即使你设置了定时是0，所有NodeJS定时器看起来都会在至少1ms之后才会触发。
- Chrome看起来像是会在1ms左右将前4个嵌套定时器触发，这之后，这个世界看起来是4ms左右。
- 不同于Chrome，Firefox看起来不会对前4个定时器做类似的处理。但是同Chrome类似，从第5个嵌套定时器开始，这个时间是4ms左右。
- Safari看起来不会对前5个定时器做类似的处理，但是从第6个嵌套定时器开始会在4ms左右。

所以，在浏览器中这个`4ms`的差距是是怎么来的？

嵌套定时器中`4ms`的这个量实际上在[HTML标准](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)中有描述。描述中写道：

> 定时器可以被嵌套。但是在第5个嵌套定时器及其之后，2个定时器间的时间间隔会被限制在至少4ms。


基于这个规则，这个帽子会从第5个嵌套定时器开始应用，正如我们在Chrome和Firefox中所看到的。然而，尽管原因不明，但是Safari看起来好像确实没有严格遵守规定，因为从实验来看，它是从第6个定时器开始，而不是第5个。

> hack这个时间。在Firefox里，这个帽子是可以使用`dom.min_timeout_value`属性在`about:config`中配置的。默认情况下，它被按照HTML标准设置为4ms。

如果抛开浏览器端，只看Node端，我们可以清楚的看到Node不会因为这个层级对这个时间间隔设置帽子。另外一个就是，Node和Chrome都有另外一种有趣的行为。

#### Node和Chrome中最小的timeout
不论是Node还是Chrome中，对于所有的定时器都强制了一个最小1ms的timeout，不论这个定时器是否嵌套。但是不同于Chrome，在NodeJS中，这个`1ms`的延时是固定的，不论层级多深。而在浏览器中，如上小节所述，会因层级有差异。

下面是NodeJS中强制定时器1ms延迟的`Timeout`类代码（以及一小段注释解释其中的原因）:
	
	functionTimeout(callback,after,args,isRepeat,isRefed){
	    after *= 1;// Coalesce to number or NaN
	    if(!(after >= 1&&after <= TIMEOUT_MAX)){
	        if(after>TIMEOUT_MAX){
	            process.emitWarning(`${after} does not fit into`+
	            ' a 32-bit signed integer.'+
	            '\nTimeout duration was set to 1.',
	            'TimeoutOverflowWarning');
	        }
	        after=1;// Schedule on next tick, follows browser behavior
	    }
	    
	    // ....redacted
	}

Chrome中也有一个对应的`DOMTimer`类代码（也可以看到当达到`maxTimerNestingLevel`这个限制后会有个`4ms`的帽子）

	DOMTimer::DOMTimer(ExecutionContext* context, PassOwnPtrWillBeRawPtr<ScheduledAction> action, int interval, bool singleShot, int timeoutID)
	    : SuspendableTimer(context)
	    , m_timeoutID(timeoutID)
	    , m_nestingLevel(context->timers()->timerNestingLevel() + 1)
	    , m_action(action)
	{
	    // ... redacted ...
	    double intervalMilliseconds = std::max(oneMillisecond, interval * oneMillisecond);
	    if (intervalMilliseconds < minimumInterval && m_nestingLevel >= maxTimerNestingLevel)
	            intervalMilliseconds = minimumInterval;
	    if (singleShot)
	        startOneShot(intervalMilliseconds, FROM_HERE);
	    else
	        startRepeating(intervalMilliseconds, FROM_HERE);
	}

如你所见，不同的JavaScript运行时针对嵌套定时器以及0延时的定时器有自己的怪异的实现。在开发JavaScript应用或者库时需要牢记这些并且严格遵循相关运行时的行为规定从而保持更好的兼容性。

#### process.nextTick 和 setImmediate
浏览器和NodeJS中的另一个主要的不同是`process.nextTick` 和 `setImmediate`。`process.nextTick `只在NodeJS中有，在浏览器中没有对应的实现。

虽然nextTick并不是必须作为NodeJS libuv 事件循环的一部分，但是nextTick回调是作为NodeJS跨C++/JS边界的结果执行的。所以可以视为与事件循环相关。

`setImmediate`也是NodeJS特有的API，根据[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/setImmediate)和[caniuse.com](https://caniuse.com/#search=setImmediate)的信息显示，`setImmediate`在IE10，IE11以及早期的Edge浏览器中存在，也不确定在未来其它浏览器会不会实现。但是就目前而言，`setImmediate`在浏览器中并不是标准。

如果你想了解更多`process.nextTick`和`setImmediate`，可以参考这篇文章。

希望这篇文章对你有所帮助！


### 参考

- https://blog.insiderattack.net/javascript-event-loop-vs-node-js-event-loop-aea2b1b85f5c
- [HTML Standard — Timers spec](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [Event loop: microtasks and macrotasks](https://javascript.info/event-loop)
- [WindowOrWorkerGlobalScope.setTimeout() — Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout)
- [libevent vs libuv · GitHub](https://gist.github.com/eddieh/c385193cf250aa51c9b1)
- [libevent](https://libevent.org/)
- [Event loop: microtasks and macrotasks](https://javascript.info/event-loop#)
- [HTML Standard — Event Loop](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)
- [ECMAScript® 2021 Language Specification](https://tc39.es/ecma262/#sec-jobs)
- [Source/core/frame/DOMTimer.cpp - chromium/blink - Git at Google](https://chromium.googlesource.com/chromium/blink/+/master/Source/core/frame/DOMTimer.cpp#93)
- 有关setTimeout的笔记 [WindowOrWorkerGlobalScope.setTimeout() — Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Notes)
- 从libuv中移除libev [https://github.com/joyent/libuv/issues/485](https://github.com/joyent/libuv/issues/485)