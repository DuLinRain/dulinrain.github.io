# NodeJS 事件循环(Event Loop) Part4 —— Handling IO 

欢迎回到NodeJS事件循环系列。在本博文中，我将详细谈谈NodeJS是如何处理I/O的。并且我希望去深入探究事件循环的实现以及I/O如何与其他异步操作一起工作。
如果你错过了该系列的前面几篇博文，我强烈推荐你回过头去看一看。

### 一、I/O从来就不意味着是同步的
当谈到NodeJS的时候，我们谈论了很多异步I/O。正如我们在第一篇博文中所说，I/O从来就不意味着是同步的。

![](https://mmbiz.qpic.cn/mmbiz_jpg/XsgEbl9Edmn2TBQGLO96dF87iaYSkibavw0nhjulHU0ovFp121eKo8vrPFE6MMqiaZicfjWYWN5CyhdNlYmYKvZhzw/0?wx_fmt=jpeg)

在所有的操作系统实现中，他们为异步I/O提供事件通知(linux中的epoll，macOS中的kqueue，solaris中的event ports，Windows 中的IOCP 等等)。NodeJS调用了这些平台级的事件通知系统来提供非阻塞、异步I/O。

正如我们所见，NodeJS是一系列的工具集，这些工具集组合在一起构成了最终的高性能NodeJS框架。这些工具集包括：

- **Chrome v8 engine** —— 实现高性能JavaScript执行
- **Libuv** —— 实现包含异步I/O的事件循环
- **c-ares** —— DNS操作
- 其它附加项 —— **http-parser**, **crypto** 和 **zlib** 等等

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9Edmn2TBQGLO96dF87iaYSkibavw18M5cDaWOto9kPxVNGUhDMY0VLl9jFmFo3Ik20GxOLP53wu35BDSwQ/0?wx_fmt=png)

在本文中，我们将讨论Libuv以及它是如何为Node提供异步I/O的。让我们再次看看事件循环流程图：

![](https://mmbiz.qpic.cn/mmbiz_png/XsgEbl9EdmkBW940mvOkic8ICx3qt8l6lrrbuM938vZbvnjxA49YIj1hmJialjDiaQVO2icQhEXR2vompRQ6spbHyA/0?wx_fmt=png)

让我们回顾一下到目前为止我们学到的事件循环的知识：

- 事件循环启动后开始执行定时器队列中的回调函数。
- 然后它处理任何挂起(pending)的I/O操作，并可选择等待任何挂起的I/O操作完成。
- 然后他会接着处理Immediate队列中的回调
- 最后，处理所有I/O close handlers
- 在每个节拍之前，libuv需要与上层Node架构(JavaScript)通信，告诉它该节拍的执行结果。每当这个发生的时候，任何中间队列(next tick队列和其它微任务队列)中的`process.nextTick`回调或promise回调会被执行。

现在，让我们试着理解NodeJS在事件循环中是如何处理I/O的

> I/O是什么？
> 
> 通常而言，任何涉及到除CPU之外的外设都称为I/O。最常见的I/O类型有文件操作以及TCP/UDP网络操作。
> 


### 二、Libuv 和 NodeJS I/O
Javascript自身没有能力去完成异步I/O操作。在开发NodeJS框架的时候，libuv最初是专门为Node提供异步I/O操作的，但是现在的Libuv已经是一个独立的包可以被独立使用。Libuv在NodeJS架构中的作用是抽象内部I/O操作的复杂性，为上层Node提供一套通用的API。这样Node才能实现平台无关的异步I/O操作。

> 温馨提示
> 
> 如果你对事件循环没有基本的了解，我建议你阅读一下该系列的前面几篇博文。在本文中，我将省略一些细节以便聚焦于I/O。
> 
> 我可能会使用一些来自libuv的代码片段，并且我只使用为Unix设计的代码片段，Wndows的代码片段有一些差异，但是道理是差不多的
> 
> 我将假设你能看的懂一点C语言代码，不需要精通，只需要了解其执行流程即可。
>

正如我们在前面的NodeJS架构图中所看到的，libuv处在NodeJS分层架构的较低层。现在让我们看一看NodeJS上层和libuv事件循环节拍之间的关系。

![](https://mmbiz.qpic.cn/mmbiz_jpg/XsgEbl9Edmn2TBQGLO96dF87iaYSkibavwUYqgpG011HjcT1FiaG9VmefLTvPu35psmgp2SPzWex049eWGicIKb7vQ/0?wx_fmt=jpeg)

我们在事件循环流程图中可以看到有4个区别明显的节拍。但是在libuv中，会有7个节拍。它们是：

1. Timers —— 过期的定时器回调（`setTimeout` 和 `setInterval`创建）会被执行
2. Pending I/O callbacks  —— 任何挂起的成功/失败的I/O操作回调会被执行
3. Idle handlers —— 处理一些libuv内部的事情
4. Prepare Handlers —— 在轮询I/O前处理一些前期工作
5. I/O Poll —— 等待任何I/O完成（可选）
6. Check handlers —— 在轮询完I/O后执行一些后置事件。通常由`setImmediate`设置的回调会在这里执行
7. Close handlers —— 执行关闭I/O操作时设置的回调

现在，如果你记得本系列的第一篇文章，你可能回想：

1. **什么是Check handlers？它并不在事件循环图里呀?**
2. **I/O Polling是什么？为什么在执行完已完成的I/O的回调函数后要阻塞I/O？难道Node不是非阻塞的吗？**

让我们解答上面这几个问题：

#### 2.1 Check Handlers
当NodeJS初始化后，它将所有的setImmediate callback在libuv中注册为Check handlers。这意味着任何使用`setImmediate`设置的callback都会放入Libuv中的Check Handlers队列，该队列一定是在事件循环中I/O操作结束后执行。

#### 2.2 I/O Polling
现在你可能会想什么是I/O Polling? 虽然我将I/O callback队列和 I/O Polling 放在了事件循环流程图的同一个节拍，但是实际上I/O Polling是在处理完所有I/O callback队列中的成功/失败的回调事件之后发生的。

但是，I/O Polling中的一个重要事实是，它是**可选的**。I/O Polling有可能会发生，也可能不发生，这取决于一定的条件。为了更好的理解这一点，让我们来看看它在libuv中的实现：

	r = uv__loop_alive(loop);
	  if (!r)
	    uv__update_time(loop);
	
	while (r != 0 && loop->stop_flag == 0) {
	    uv__update_time(loop);
	    uv__run_timers(loop);
	    ran_pending = uv__run_pending(loop);
	    uv__run_idle(loop);
	    uv__run_prepare(loop);
	
	    timeout = 0;
	    if ((mode == UV_RUN_ONCE && !ran_pending) || mode == UV_RUN_DEFAULT)
	      timeout = uv_backend_timeout(loop);
	
	    uv__io_poll(loop, timeout);
	    uv__run_check(loop);
	    uv__run_closing_handles(loop);
	
	    if (mode == UV_RUN_ONCE) {
	      uv__update_time(loop);
	      uv__run_timers(loop);
	    }
	
	    r = uv__loop_alive(loop);
	    if (mode == UV_RUN_ONCE || mode == UV_RUN_NOWAIT)
	      break;
	}

可能对于不熟悉C语言的人来说上面的代码可能有点晃眼睛。但是不要担心，让我来大概看看它的流程。上面的代码是截取的libuv源代码`code.c`文件中`ub_run`函数的一个片段。但是，最重要的是，这是**NodeJS事件循环的核心**。

如果你再看一看图3，上面的代码看起来会更有意义。让我么来一行一行解读上面的代码。

1. `uv__loop_alive` —— 检查是否有被引用的处理函数或者挂起的行为需要被执行
2. `uv__update_time` —— 这会发起一个系统调用获取当前时间并更新循环时间（这被用来识别过期的定时器）
3. `uv__run_timers` —— 运行所有的定时器回调
4. `uv__run_pending` —— 运行所有成功/失败的I/O回调
5. `uv__io_poll` —— 轮询I/O
6. `uv__run_check ` —— 运行所有的check handlers（所有通过`setImmediate`添加的回调会在这里执行） 
7. `uv__run_closing_handles ` —— 运行所有close handlers

起初，事件循环检查事件循环是否存活，这是通过调用`uv__loop_alive`实现的，`uv__loop_alive` 函数相当简单：

	static int uv__loop_alive(const uv_loop_t* loop) {
	  return uv__has_active_handles(loop) ||
	         uv__has_active_reqs(loop) ||
	         loop->closing_handles != NULL;
	}

`uv__loop_alive` 函数简单的返回一个布尔值。当满足以下条件时，该值为true:

- 有存活的handles待调用(There are active handles to be invoked)
- 有挂起的请求或操作(There are active requests (active operations) pending)
- 有任何close方法的回调函数需要被处理（There are any closing handlers to be invoked）

只要`uv__loop_alive` 函数返回true, 事件循环将会继续运转。

当执行完所有过期的定时器的回调函数之后，`uv__run_pending`函数将被调用。这个函数会遍历libuv里`pending_queue`中所有的已完成的I/O事件。如果`pending_queue`是空的，改函数会返回0. 否则所有`pending_queue`中的回调都会被执行，函数会返回1。

	static int uv__run_pending(uv_loop_t* loop) {
	  QUEUE* q;
	  QUEUE pq;
	  uv__io_t* w;
	
	  if (QUEUE_EMPTY(&loop->pending_queue))
	    return 0;
	
	  QUEUE_MOVE(&loop->pending_queue, &pq);
	
	  while (!QUEUE_EMPTY(&pq)) {
	    q = QUEUE_HEAD(&pq);
	    QUEUE_REMOVE(q);
	    QUEUE_INIT(q);
	    w = QUEUE_DATA(q, uv__io_t, pending_queue);
	    w->cb(loop, w, POLLOUT);
	  }
	
	  return 1;
	}
	
现在让我们看看  I/O Polling，它是通过调用libuv中`uv__io_poll`函数完成的。

你应该看到了，`uv__io_poll`函数接收第二个参数`timeout`, 该参数是通过`uv_backend_timeout`计算得来的。`uv__io_poll`函数通过这个参数决定它将阻塞I/O多久。 如果`timeout`值是0，I/O Polling会被跳过，事件循环会走到check handlers (setImmediate) 节拍。`timeout`的值由什么决定是一个很有意思的议题。 基于上述uv_run中的代码，我们可以推导下面的结论：

- 如果事件循环运行在`UV_RUN_DEFAULT`模式，`timeout`是使用`uv_backend_timeout`计算。
- 如果事件循环运行在`UV_RUN_ONCE`模式并且`uv_run_pending`返回0(即pending_queue使空的)，`timeout`也是使用`uv_backend_timeout`计算。
- 否则，`timeout`是0.

> 在这里我们不用担心诸如`UV_RUN_DEFAULT`和`UV_RUN_ONCE`的事件循环的不同模式。但是如果你真的想了解他们是啥，点击这里了解更多。
> 

现在让我们进一步看看`uv_backend_timeout`函数从而更好的理解`timeout`是如何计算的：

	int uv_backend_timeout(const uv_loop_t* loop) {
	  if (loop->stop_flag != 0)
	    return 0;
	
	  if (!uv__has_active_handles(loop) && !uv__has_active_reqs(loop))
	    return 0;
	
	  if (!QUEUE_EMPTY(&loop->idle_handles))
	    return 0;
	
	  if (!QUEUE_EMPTY(&loop->pending_queue))
	    return 0;
	
	  if (loop->closing_handles)
	    return 0;
	
	  return uv__next_timeout(loop);
	}
	
- 如果`stop_flag`被设置成退出标识，`timeout`将是`0`.
- 如果没有正在处理的回调或者挂起的操作，`timeout`将是`0`.
- 如果有挂起的idle handles待执行，那么不应该等待I/O，`timeout`将是`0`.
- 如果有任意的close handlers等待被处理，那么不应该等待I/O，因此，timeout将是`0`.

如果上面的任意一条准则都不满足，`uv__next_timeout` 将会被调用，用来决定需要等待多久I/O。

	int uv__next_timeout(const uv_loop_t* loop) {
	  const struct heap_node* heap_node;
	  const uv_timer_t* handle;
	  uint64_t diff;
	
	  heap_node = heap_min((const struct heap*) &loop->timer_heap);
	  if (heap_node == NULL)
	    return -1; /* block indefinitely */
	
	  handle = container_of(heap_node, uv_timer_t, heap_node);
	  if (handle->timeout <= loop->time)
	    return 0;
	
	  diff = handle->timeout - loop->time;
	  if (diff > INT_MAX)
	    diff = INT_MAX;
	
	  return diff;
	}

`uv__next_timeout`做了什么呢？它将返回最接近的定时器的值。如果没有定时器，将返回`-1`，表示无限大。

现在可能对“**为什么我们在执行完已完成的I/O回调后要阻塞I/O？难道Node不是非阻塞的吗？**”有了答案。

如果有任何挂起的任务待执行，事件循环就**不会被阻塞**。如果没有挂起的任务待处理，它只会阻塞到下一个定时器到期，然后会重启事件循环。

> 我希望你仍然跟随着我。我知道这可能对你来说太过于详细。但是为了更加清晰的理解它，有必要对底层究竟发生了什么有清晰的认识。


现在我们知道事件循环需要为I/O完成等待多久了，这个`timeout`值然后被送到`uv__io_poll`函数。此函数会观测任意进来的I/O操作直到`timeout`到期或者到达系统指定的最大安全超时时间。在这之后，事件循环会再次活跃起来并走到下一个节拍——check handlers。

I/O Polling在不同的操作系统表现也不同。在Linux中，这是通过调用内核系统`epoll_wait`完成的，在MacOS中是使用的`kqueue`。在Windows系统，他是使用IOCP(Input Output Completion Port)中的`GetQueuedCompletionStatus`完成。在此，我不会深入探究I/O Polling是如何工作的，因为它确实相当的复杂。这需要另外一个系列文章来写(我不认为我会写)。

#### 2.3 关于线程池
到目前为止，我们在本文中还没有讨论过线程池。正如我们在此系列的第一篇文章中所讲，线程池主要用来所有的文件I/O操作，以及DNS操作过程中的`getaddrinfo` 和 `getnameinfo`调用，这仅仅是由于不同平台文件I/O的复杂性(想更清晰地了解其复杂性，可查看这篇博文)。由于线程池的大小是有限制的(默认是**4**),多个对文件操作的请求可能仍然会被阻塞直到某个线程被释放。但是，为了提高应用程序的性能，线程池的大小可以通过环境变量`UV_THREADPOOL_SIZE`增加到**128**。

同样，这个被限定大小的线程池被认为是NodeJS的一个瓶颈，因为不仅仅File I/O, `getaddrinfo`, `getnameinfo`这几个操作是通过线程池完成的。某些CPU密集型加密操作（如`randomBytes`，`randomFill`和`pbkdf2`）也在libuv线程池上运行，以防止对应用程序性能产生任何不利影响。这也使得可用的线程对I/O操作来说是一种稀缺资源。

在之前的libuv增强提案中，曾建议根据负载伸缩线程池，但是该提案最终被撤回了，为的是未来通过可插拔的API形式来替代

### 总结
在这篇博文中，我通过深入研究libuv的源码详细讲述了NodeJS是如何处理I/O的。我相信你更理解了NodeJS的非阻塞、事件驱动模型。
