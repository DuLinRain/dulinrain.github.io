# NodeJS 事件循环(Event Loop) Part1——总体概况

NodeJS区别于其它编程平台主要是在于它处理I/O的方式。 在别人介绍NodeJS的时候我们总会听到他们说NodeJS是**“一个基于google V8 javascript引擎的非阻塞、事件驱动的平台**”。那这句话到底是什么意思呢？“非阻塞”以及“事件驱动”到底意味着什么呢？这些问题的所有答案埋藏在NodeJS的核心部分——**Event Loop(事件循环)**。

在这一系列的博文中，我将讲述什么是**Event Loop**，它是如何工作的，它如何影响我们的应用程序以及如何充分地利用它。为什么要用一系列的博文而不是一篇呢？好吧，如果写成一篇的话将会非常的长，并且我有可能会丢失比较重要的内容，因此我为此写了一个系列的文章。在这第一篇博文中，我将讲述“NodeJS是如何工作的”，“它如何访问I/O”以及“它是怎样在不同平台工作的”等内容。

### 一、Reactor模式
NodeJS以事件驱动的模式工作，这种模式涉及**事件解复用器(Demultiplexer)**以及**事件队列(Event Queue)**. 所有的I/O请求最终会产生一个成功/失败的事件或者其它触发器，统称为事件(Event)。这些事件被按照以下算法处理：

1. 事件解复用器(Demultiplexer)接受I/O请求并将这些请求委托给合适的硬件。
2. 一旦I/O请求被处理(比如：文件中的数据已经就绪可被读取，socket中的数据可被读取等)，事件解复用器会将注册的回调处理函数放入一个特定行为的队列等待被处理。 这些回调称为事件，所放入的队列称为**事件队列(Event Queue)**。
3. 当事件队列中的事件可被处理的时候，他们被按接收的顺序依次执行直至队列为空。
4. 如果事件队列中任何事件或者 事件解复用器不再有等待中的请求，程序将结束。 否则以上过程会从第一步开始继续循环。

实现整个处理机制的程序称为**事件循环(Event Loop)**。



![](https://mmbiz.qpic.cn/mmbiz_jpg/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lVpGbC3LuTpUe9bPqlFKvPglL5LvbUYnJDClRwhzbnbOHU786eqIPIQ/0?wx_fmt=jpeg)



Event Loop是一个单线程、半无限循环。之所以说是半无限循环是因为在某个时候没有任何任务需要处理的时候这个循环会退出。在开发者的视角，这就是程序退出的时候。

>注意：不要让自己被Event Loop和NodeJS Emitter迷惑。Emitter是和这个完全不同的机制。在稍后的博文中，我将会解释Event Emitter如何通过Event Loop影响事件处理。


上面的流程图是从上层视角看NodeJS如何工作并且展示了**Reactor模式**的主要组成部分。但实际上远比这描述的复杂。 所以怎么解释这个呢？

>事件解复用器(Event demultiplexer)并不是单个组件用于处理所有操作系统下所有类型的I/O
>
>事件队列也不是像这里图中看到的这样：所有类型的事件入/出一个队列。并且I/O也不是唯一被入列的事件类型。
>

所以，让我们更深入的来看看。

#### 1.1、事件解复用器(Event demultiplexer)
事件解复用器(Event demultiplexer)并不是一个真实存在的组件，它只是reactor模式中的一个抽象概念。在真实世界里，事件解复用器已经在不同的系统以不同的名字被实现，比如Linux中的**epoll**, BSD(MacOS)中的**kqueue**, Solaris 中的**event ports**, Windows 中的**IOCP (Input Output Completion Port)** , 等等. NodeJS使用了这些底层实现所提供的非阻塞、异步硬件I/O功能。

#### 1.2、文件I/O的复杂性
但令人困惑的事实是，并不是所有类型的I/O都可以使用这些底层能力实现。即使在相同的操作系统平台下，支持不同类型的I/O也非常复杂。通常，可以用epoll, kqueue, event ports 和 IOCP以非阻塞的方式处理网络I/O，但是文件I/O比这复杂的多。某些特定的系统，比如Linux不支持完全异步的文件访问，并且在MacOS系统中使用kqueue进行文件事件通知也有一些限制(可以在[这里](https://blog.libtorrent.org/2012/10/asynchronous-disk-io/)了解更多)。为了提供完全的异步性，解决所有这些文件系统的复杂性是非常复杂或几乎不可能的。

#### 1.3、DNS的复杂性

类似于文件I/O，一些Node API 提供的DNS函数也具有一定的复杂性。由于NodeJS DNS函数，比如`dns.lookup`会访问系统配置文件(如`nsswitch.conf`, `resolv.conf` 和 `/etc/hosts`)，上面提到的文件系统的复杂性同样适用于`dns.resolve`函数。

#### 1.4、解决方案？
因此，引入了一个线程池用来支持不能直接被硬件异步I/O单元(如epoll/kqueue/event ports, IOCP)处理的I/O函数。现在我们知道并不是所有的I/O函数发生在线程池中。 NodeJS尽可能的使用非阻塞、异步硬件I/O能力处理I/O，但是对于阻塞的I/O或者上述复杂的I/O。它使用线程池处理。

#### 1.5、综上
如我们所见，在真实世界里，支持所有不同操作系统下的所有类型的I/O(file I/O, network I/O, DNS, 等等)是非常困难的。某些I/O可以直接使用原生硬件实现并且保证完全异步，但是还有一些特定的I/O需要放到线程池中才能保证异步。

> 注意：开发者通常普遍有一个误解就是认为Node将所有的I/O放在线程池中处理。

为了掌控整个过程并且支持跨平台I/O，需要有一个抽象层来封装这些平台间和平台内的复杂性并且给上层Node暴露一个通用的API。

所以，这个抽象层是什么呢？女士们，先生们，欢迎libuv登场

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lbMl1bkLBklXBtLcOzbWYAhQG4DMOweic0z7suqhlOJYp1vNtPZC8Tyw/0?wx_fmt=png)

来自[libuv官方文档](http://docs.libuv.org/en/v1.x/design.html)：

>libuv是一个最初为NodeJS而写的支持跨平台的库。它围绕事件驱动的异步I/O模型而写。
>此库不仅仅只是提供一个对不同I/O轮询机制：handles的简单抽象层，而且其中的’stream‘还提供了对socket以及其它实体的高级抽象。跨平台文件I/O，线程功能以及其它东西。


现在让我们看看libuv的组成，下面这张图来自libuv官方文档，它描述了在暴露通用API的情况下不同类型的I/O是如何被处理的。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lk59Kdr8Libwson9PqDtfEcmmR68Mo2CyHZUiaVnz2xada0TNIicvq4Urg/0?wx_fmt=png)

现在我们知道了事件解复用器(Event Demultiplexer)并不是一个原子性的实体，而是一个被libuv抽象后的I/O处理API的集合，并且被暴露给NodeJS的上层。libuv不仅仅为Node提供了事件解复用器，它还提供了整个包括事件队列机制在内的整个事件循环功能。

现在让我们来看看**事件队列(Event Queue)**。

### 二、事件队列(Event Queue)
事件队列通常被认为是一种数据结构，所有的事件入队并被事件循环(event loop)顺序处理直至队列为空。但是这个过程在NodeJS中是与Reactor抽象模式中所描述的完全不同的方式。 所以，不同在哪里？

>在NodeJS中不止有一个队列，不同类型的事件会进入到各自的队列中
>
>当处理完一个节拍并且在进入下一个节拍之前，事件循环会处理2个中间队列知道没有任何事件驻留在中间队列。
>

所以，到底有多少个队列呢？中间队列又是什么呢？

原生的libuv事件循环一共会处理4种类型的队列：

- **Expired timers and intervals queue(定时器队列)** —— 包含所有setTimeout或setInterval设置的callback
- **IO Events Queue (I/O)** —— 完全的I/O事件
- **Immediates Queue(Immediates队列)** —— 使用setImmediate函数添加的callback
- **Close Handlers Queue(句柄关闭队列)** —— 任何close事件处理函数

> 注意：尽管我管他们都叫做“队列”，但是他们中有些其实是使用的不同的结构(比如，timers被存储在最小堆(min-heap)中)
> 

除了以上4种主要的队列，还有其它2种非常有趣的队列，这2种队列之前被我称做“中间队列”，并且这2种队列是由Node处理的。尽管这2种队列不属于libuv自身的部分，但是他们属于NodeJS. 它们是：

- **Next Ticks Queue(nextTick队列)** —— 通过process.nextTick设置的callback
- **Other Microtasks Queue(其它微任务队列)** —— 包括promise resolve后的callbak

#### 2.1 事件队列如何工作的？
正如你在下图看到的，Node启动事件循环，检查在 timers queue中是否有超时的定时器(如有会处理)，接着按顺序走到下面的每一步，同时会维护一个待处理的事件的总数值。当处理完所有的Close Handlers Queue中的事件后，如果在所有队列中都没有任何待处理的事件并且没有任何阻塞的操作，事件循环将会退出。处理事件循环中的每个队列都可以被认为是事件循环的一个节拍(phase)。

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lrrbuM938vZbvnjxA49YIj1hmJialjDiaQVO2icQhEXR2vompRQ6spbHyA/0?wx_fmt=png)

图中绘成红色的中间队列非常有意思：一旦一个节拍被完成，事件循环会检查这2个中间队列看是否有待处理的事件。如果有，事件循环将立即开始处理这些事件直到这2个队列为空。一旦为空，事件循环会继续进入下一个节拍。

> 比如, 事件循环现在正在处理Immediates Queue，队列中有5个事件等待处理。与此同时，有2个事件被加入到了Next Ticks Queue。一旦事件循环处理完Immediates Queue中的5个事件，在进入Close Handlers Queue节拍之前，事件循环会检测到在Next Ticks Queue中有2个事件待处理。事件循环会先执行Next Ticks Queue中的这2个事件，然后才会进入到下一个节拍处理Close Handlers Queue中的事件。
> 


#### 2.2 nextTick队列 vs 其它微任务 (Next tick queue vs Other Microtasks)
Next tick queue有比Other Microtasks更高的优先级。但是，他们都是在事件循环的2个节拍的间隔处被处理，这个时刻就是在节拍结束，libuv与上层Node通信的时候。你可能注意到，我使用的是暗红色的颜色标识Next tick queue，这意味着在开始处理微任务队列中的promise的时候，Next tick queue已经被处理完了。

> “Next tick queue有比Other Microtasks更高的优先级” 这只适用于V8提供的原生Promise。 如果你使用的是`Q`库或者`bluebird`库，你会发现完全不同的结果，这是因为他们早于原生Promise并且具有不同的语义。
> 
> 
> Q库和bluebird库在处理resolved promise的时候也有区别，这个我会在后面的博文中解释。
> 


这些所谓的“中间队列”的行为引入了一个新的问题——IO饥饿。持续地使用`process.nextTick`函数填充Next Ticks Queue会迫使事件循环无限地在处理Next Ticks Queue，导致不会进入下一个节拍。这就导致了IO饥饿，因为在清理完Next Ticks Queue前事件循环无法继续。

> 为了避免这个问题，曾经可以使用`process.maxTickDepth`对Next Ticks Queue的极限做限制，但是不知为啥从[NodeJS v0.12开始被移除](https://strongloop.com/strongblog/node-js-v0-12-apis-breaking/#process_maxtickdepth_removed)了。


在后面的博文中，我会带着例子深入讲述这些队列。

### 总结

现在你知道了事件循环是什么，它是如何工作的以及Node如何处理异步I/O的。现在让我们再看看libuv在整个NodeJS架构体系中的存在。

![](https://mmbiz.qpic.cn/mmbiz_jpg/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lJM6NruuvOUibSqY7pwT4YWesd5ibVp6NNOY7cTB0aqdre2pOlDTbamicQ/0?wx_fmt=jpeg)

我希望你会发现这篇博文会有用，并且在接下来的博文中，我将介绍：

- Timers, Immediates and `process.nextTick`
- Resolved Promises and `process.nextTick`
- Handling I/O
- Best Practices in dealing with the Event Loop

以及更多的细节。





